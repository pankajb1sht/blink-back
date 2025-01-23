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
app.use(cors());
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

// Create a dynamic "blink"
app.post('/api/blink/create', async (req: Request<{}, {}, BlinkRequest>, res: Response, next: NextFunction) => {
  try {
    const { channelName, description, fee, coverImage = 'https://example.com/default-icon.png', publicKey, link, telegramLink } = req.body;

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
    if (!link || !isValidUrl(link)) {
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
      coverImage: coverImage || 'https://example.com/default-icon.png',
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

    const connection = new Connection(clusterApiUrl('devnet'));
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const postResponse = await createPostResponse({
      fields: {
        transaction,
        message: `Thanks for joining! After payment, you can access the channel at: ${blink.link} (Telegram: ${blink.telegramLink})`,
        type: 'transaction',
      },
    });

    // Add link to the response without modifying the createPostResponse type
    return res.json({
      ...postResponse,
      channelLink: blink.link,
      telegramLink: blink.telegramLink
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// Debug endpoint - list all channels
app.get('/api/channels/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await readData();
    return res.json(data.blinks.map(({ channelName, description, fee, route, createdAt }) => ({
      channelName,
      description,
      fee,
      route,
      createdAt
    })));
  } catch (error) {
    next(error);
  }
});

// Add URL validation helper
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Apply error handler
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
