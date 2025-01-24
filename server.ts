import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import {
  ActionGetResponse,
  actionCorsMiddleware,
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
import rateLimit from 'express-rate-limit';

interface BlinkRequest {
  channelName: string;
  description: string;
  fee: number;
  publicKey: string;
  coverImage?: string;
  telegramLink: string;
}

interface BlinkData extends Omit<BlinkRequest, 'coverImage'> {
  route: string;
  createdAt: string;
  link: string;
  coverImage: string;
}

interface StorageData {
  blinks: BlinkData[];
}

const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');

// Response headers
const actionHeaders = {
  'X-Action-Version': '1',
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

// Validation helpers
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

function isValidTelegramLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 't.me' || parsed.hostname === 'telegram.me';
  } catch {
    return false;
  }
}

// Create a dynamic "blink"
app.post('/api/blink/create', async (req: Request<{}, {}, BlinkRequest>, res: Response, next: NextFunction) => {
  try {
    const { channelName, description, fee, coverImage, publicKey, telegramLink } = req.body;

    // Input validation
    if (!validateChannelName(channelName)) {
      return res.status(400).json({ error: 'Invalid channel name. Use only letters, numbers, spaces, hyphens, and underscores (3-50 characters).' });
    }
    if (description.trim().length < 10 || description.length > 1000) {
      return res.status(400).json({ error: 'Description must be between 10 and 1000 characters' });
    }
    if (fee <= 0 || fee > 1000) {
      return res.status(400).json({ error: 'Fee must be between 0 and 1000' });
    }
    if (!publicKey.trim()) {
      return res.status(400).json({ error: 'Public key is required' });
    }
    if (coverImage && !isValidUrl(coverImage)) {
      return res.status(400).json({ error: 'Invalid cover image URL' });
    }
    if (!isValidTelegramLink(telegramLink)) {
      return res.status(400).json({ error: 'Invalid Telegram link. Must be a t.me or telegram.me URL' });
    }

    // Validate public key
    let pubKey: PublicKey;
    try {
      pubKey = new PublicKey(publicKey);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid public key format' });
    }

    const route = `/api/${channelName.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Read existing data
    let data: StorageData;
    try {
      data = await readData();
    } catch (error) {
      console.error('Error reading data:', error);
      return res.status(500).json({ error: 'Error accessing storage' });
    }
    
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
      publicKey: pubKey.toString(),
      createdAt: new Date().toISOString(),
      telegramLink,
      link: `${process.env.BASE_URL || 'https://blink-back.onrender.com'}${route}`,
    };

    // Save to storage
    try {
      data.blinks.push(newBlink);
      await writeData(data);
    } catch (error) {
      console.error('Error writing data:', error);
      return res.status(500).json({ error: 'Error saving data' });
    }

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

   
res.set(actionHeaders).json(payload);

  } catch (error) {
    next(error);
  }
});

// POST transaction for channel payments
app.post('/api/:channelName', async (req: Request<{ channelName: string }>, res: Response, next: NextFunction) => {
  try {
    const { channelName } = req.params;
    const { account } = req.body;

    if (!account) {
      return res.status(400).json({ error: 'Account is required' });
    }

    let accountPubKey: PublicKey;
    try {
      accountPubKey = new PublicKey(account);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid account public key' });
    }

    const data = await readData();
    const blink = data.blinks.find(b => b.route === `/api/${channelName.toLowerCase().replace(/\s+/g, '-')}`);

    if (!blink) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const connection = new Connection(clusterApiUrl('devnet'));
    const recipientPubKey = new PublicKey(blink.publicKey);

    // Check account balance
    try {
      const balance = await connection.getBalance(accountPubKey);
      const requiredAmount = blink.fee * LAMPORTS_PER_SOL;
      if (balance < requiredAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Error checking balance' });
    }

    const transferSolInstruction = SystemProgram.transfer({
      fromPubkey: accountPubKey,
      toPubkey: recipientPubKey,
      lamports: blink.fee * LAMPORTS_PER_SOL,
    });

    const transaction = new Transaction({
      feePayer: accountPubKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    }).add(transferSolInstruction);

    const postResponse = await createPostResponse({
      fields: {
        transaction,
        message: `Thanks for joining! After payment, you can access the channel at: ${blink.link} (Telegram: ${blink.telegramLink})`,
        type: 'transaction',
      },
    });

    res.set(actionHeaders).json({
      ...postResponse,
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

// Apply error handler
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
