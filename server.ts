import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import {
  ActionGetResponse,
  MEMO_PROGRAM_ID,
  createPostResponse,
} from '@solana/actions';
import {
  clusterApiUrl,
  ComputeBudgetProgram,
  Connection,
  Transaction,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');

// CORS setup
const corsOptions = {
  origin: '*', // Change this to a specific origin in production
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Action-Version', 'X-Blockchain-Ids'],
};
app.use(cors(corsOptions)); // Apply CORS middleware globally

// Handle preflight requests explicitly
app.options('/api/blink/create', (req, res) => {
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Action-Version, X-Blockchain-Ids');
  res.sendStatus(200); // Respond with HTTP 200 for preflight requests
});

// Handle preflight requests for dynamic routes
app.options('/api/:channelName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { channelName } = req.params;
    const route = `/api/${channelName.toLowerCase().replace(/\s+/g, '-')}`;
    
    const data = await readData();
    const blink = data.blinks.find(b => b.route === route);

    if (!blink) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Action-Version, X-Blockchain-Ids');
    return res.sendStatus(200); // Respond with HTTP 200 for preflight requests
  } catch (error) {
    next(error);
  }
});

app.use(express.json());

interface BlinkRequest {
  channelName: string;
  description: string;
  fee: number;
  coverImage: string | undefined;
  publicKey: string;
  link: string;
  telegramLink: string;
}

interface BlinkData {
  route: string;
  channelName: string;
  description: string;
  fee: number;
  coverImage: string;
  publicKey: string;
  link: string;
  createdAt: string;
  telegramLink: string;
}

interface StorageData {
  blinks: BlinkData[];
}

// Action API headers
const actionHeaders = {
  'X-Action-Version': '1.0',
  'X-Blockchain-Ids': 'solana',
};

// Error handling middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
};

// Data storage functions
async function readData(): Promise<StorageData> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { blinks: [] };
  }
}

async function writeData(data: StorageData): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Validate channel name
function validateChannelName(name: string): boolean {
  return /^[a-zA-Z0-9-_\s]{3,50}$/.test(name);
}

// Add URL validation helper
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Create a dynamic "blink"
app.post('/api/blink/create', async (req: Request<{}, {}, BlinkRequest>, res: Response, next: NextFunction) => {
  try {
    const { channelName, description, fee, coverImage , publicKey, telegramLink } = req.body;

    // Input validation
    if (!validateChannelName(channelName)) {
      return res.status(400).json({ error: 'Invalid channel name. Use only letters, numbers, spaces, hyphens, and underscores (3-50 characters).' });
    }
    if (description.trim().length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters long' });
    }
    if (fee <= 0) {
      return res.status(400).json({ error: 'Invalid fee amount' });
    }
    if (!publicKey.trim()) {
      return res.status(400).json({ error: 'Public key is required' });
    }
    if (!coverImage || !isValidUrl(coverImage)) {
      return res.status(400).json({ error: 'Valid link is required' });
    }

    // Validate public key
    try {
      new PublicKey(publicKey);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid public key format' });
    }

    const route = `/api/${channelName.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Read existing data
    const data = await readData();
    
    // Check for duplicate route
    if (data.blinks.some(b => b.route === route)) {
      return res.status(400).json({ error: 'Channel name already exists' });
    }

    // Create new blink
    const newBlink: BlinkData = {
      route,
      channelName,
      description,
      fee,
      coverImage,
      publicKey,
      link,
      createdAt: new Date().toISOString(),
      telegramLink,
    };

    // Save to storage
    data.blinks.push(newBlink);
    await writeData(data);

    return res.status(201).json({ 
      message: 'Channel created successfully', 
      route,
      channelName: newBlink.channelName
    });
  } catch (error) {
    next(error);
  }
});

// Handle dynamic GET responses
app.get('/api/:channelName', async (req: Request<{ channelName: string }>, res: Response, next: NextFunction) => {
  try {
    const { channelName } = req.params;
    const route = `/api/${channelName.toLowerCase().replace(/\s+/g, '-')}`;
    
    const data = await readData();
    const blink = data.blinks.find(b => b.route === route);

    if (!blink) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const payload: ActionGetResponse = {
      icon: blink.coverImage,
      label: 'Join our Telegram channel',
      title: blink.channelName,
      description: blink.description,
    };

    res.set(actionHeaders); // Set required headers
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

// Handle POST requests for transactions
app.post('/api/:channelName', async (req: Request<{ channelName: string }>, res: Response, next: NextFunction) => {
  try {
    const { channelName } = req.params;
    const { account } = req.body;

    if (!account) {
      return res.status(400).json({ error: 'Account is required' });
    }

    const data = await readData();
    const blink = data.blinks.find(b => b.route === `/api/${channelName.toLowerCase().replace(/\s+/g, '-')}`);

    if (!blink) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const accountPubKey = new PublicKey(account);
    const recipientPubKey = new PublicKey(blink.publicKey);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: accountPubKey,
        toPubkey: recipientPubKey,
        lamports: blink.fee * LAMPORTS_PER_SOL,
      })
    );

    transaction.feePayer = accountPubKey;

    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 }),
      new TransactionInstruction({
        keys: [],
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(
          JSON.stringify({
            action: 'create-blink',
            channelName: blink.channelName,
            description: 'Thanks for joining!',
            fee: blink.fee,
          })
        ),
      })
    );

    const connection = new Connection(clusterApiUrl('mainnet-beta')); // Changed to mainnet-beta

    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const postResponse = await createPostResponse({
      fields: {
        transaction,
        message: `Thanks for joining! After payment, you can access the channel at: ${blink.link} (Telegram: ${blink.telegramLink})`,
        type: 'transaction',
      },
    });

    res.set(actionHeaders); // Set required headers
    return res.json({
      ...postResponse,
      channelLink: blink.link,
      telegramLink: blink.telegramLink,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// Error handler middleware
app.use(errorHandler);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
