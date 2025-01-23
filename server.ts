import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
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

// Generate unique code
function generateUniqueCode(): string {
  return crypto.randomBytes(6).toString('hex');
}

interface BlinkRequest {
  channelName: string;
  description: string;
  fee: number;
  coverImage?: string;
  publicKey: string;
  link: string;
  telegramLink: string;
}

interface BlinkData extends BlinkRequest {
  uniqueCode: string;
  createdAt: string;
}

interface StorageData {
  blinks: BlinkData[];
}

// CORS setup with more secure defaults
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'https://yourdomain.com',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Action-Version', 'X-Blockchain-Ids'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

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

// Validation helpers
function validateChannelName(name: string): boolean {
  return /^[a-zA-Z0-9-_\s]{3,50}$/.test(name);
}

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
    const { channelName, description, fee, coverImage = 'https://example.com/default-icon.png', publicKey, link, telegramLink } = req.body;

    // Validation checks (similar to previous implementation)
    if (!validateChannelName(channelName)) {
      return res.status(400).json({ error: 'Invalid channel name' });
    }
    if (description.trim().length < 10) {
      return res.status(400).json({ error: 'Description too short' });
    }
    if (fee <= 0) {
      return res.status(400).json({ error: 'Invalid fee amount' });
    }
    if (!publicKey.trim()) {
      return res.status(400).json({ error: 'Public key is required' });
    }
    if (!link || !isValidUrl(link)) {
      return res.status(400).json({ error: 'Invalid link' });
    }

    // Validate public key
    try {
      new PublicKey(publicKey);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid public key format' });
    }

    const data = await readData();
    
    // Generate unique code
    const uniqueCode = generateUniqueCode();

    // Create new blink
    const newBlink: BlinkData = {
      uniqueCode,
      channelName,
      description,
      fee,
      coverImage,
      publicKey,
      link,
      telegramLink,
      createdAt: new Date().toISOString(),
    };

    // Save to storage
    data.blinks.push(newBlink);
    await writeData(data);

    return res.status(201).json({ 
      message: 'Blink created successfully', 
      uniqueCode,
      link: `/api/blink/${uniqueCode}`
    });
  } catch (error) {
    next(error);
  }
});

// Handle dynamic GET responses
app.get('/api/blink/:uniqueCode', async (req: Request<{ uniqueCode: string }>, res: Response, next: NextFunction) => {
  try {
    const { uniqueCode } = req.params;
    
    const data = await readData();
    const blink = data.blinks.find(b => b.uniqueCode === uniqueCode);

    if (!blink) {
      return res.status(404).json({ error: 'Blink not found' });
    }

    const payload: ActionGetResponse = {
      icon: blink.coverImage,
      label: `Join for ${blink.fee} SOL`,
      title: blink.channelName,
      description: `${blink.description} (Fee: ${blink.fee} SOL)`,
    };

    res.set({
      'X-Action-Version': '1.0',
      'X-Blockchain-Ids': 'solana',
    });
    
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

// Handle POST requests for transactions
app.post('/api/blink/:uniqueCode', async (req: Request<{ uniqueCode: string }>, res: Response, next: NextFunction) => {
  try {
    const { uniqueCode } = req.params;
    const { account } = req.body;

    if (!account) {
      return res.status(400).json({ error: 'Account is required' });
    }

    const data = await readData();
    const blink = data.blinks.find(b => b.uniqueCode === uniqueCode);

    if (!blink) {
      return res.status(404).json({ error: 'Blink not found' });
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

    res.set({
      'X-Action-Version': '1.0', 
      'X-Blockchain-Ids': 'solana',
    });
    
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

// List channels endpoint
app.get('/api/channels/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await readData();
    return res.json(data.blinks.map(({ channelName, description, fee, uniqueCode, createdAt }) => ({
      channelName,
      description,
      fee,
      uniqueCode,
      createdAt,
    })));
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
