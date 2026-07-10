// src/app/api/game/deal/route.ts
// Serverless Route Handler for the "Real World Play" module.
//
// POST -> seats the requesting human, auto-fills any remaining empty
//         seats with AI bots (the 15s matchmaking countdown is a
//         client-side timer that simply calls this route once it
//         expires), shuffles a fresh deck, and deals a new hand.
// GET  -> returns the current state of an in-progress table, scoped to
//         the requesting viewer so opponents' hole cards stay hidden.
//
// NOTE: table instances are held in an in-memory Map for this MVP stage.
// Because Next.js can run route handlers across multiple serverless
// instances, this is NOT safe for a real multi-instance deployment —
// swap `tables` for a Redis-backed (or Prisma + a row lock) store before
// going anywhere near production / real LKR balances.

import { NextRequest, NextResponse } from 'next/server';
import { Dealer } from '@/lib/poker/dealer';

const tables = new Map<string, Dealer>();

const DEFAULT_SEATS = 6;
const DEFAULT_SMALL_BLIND = 50; // LKR
const DEFAULT_BIG_BLIND = 100; // LKR
const DEFAULT_BOT_STACK = 5000; // LKR
const MATCHMAKING_TIMEOUT_MS = 15_000;

interface DealRequestBody {
  tableId: string;
  userId: string;
  displayName: string;
  buyIn: number; // LKR the human is bringing to the table
  seats?: number;
  smallBlind?: number;
  bigBlind?: number;
}

export async function POST(req: NextRequest) {
  let body: DealRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { tableId, userId, displayName, buyIn } = body;
  if (!tableId || !userId || !displayName || !buyIn || buyIn <= 0) {
    return NextResponse.json(
      { error: 'tableId, userId, displayName, and a positive buyIn (LKR) are required.' },
      { status: 400 }
    );
  }

  let dealer = tables.get(tableId);
  if (!dealer) {
    dealer = new Dealer({
      tableId,
      seats: body.seats ?? DEFAULT_SEATS,
      smallBlind: body.smallBlind ?? DEFAULT_SMALL_BLIND,
      bigBlind: body.bigBlind ?? DEFAULT_BIG_BLIND,
    });
    tables.set(tableId, dealer);

    // Seat the human at seat 0 on table creation. A fuller lobby
    // implementation would let the client pick a seat / auto-assign the
    // first empty one; kept simple here since seat selection is a UI
    // concern, not a dealer-engine one.
    try {
      dealer.seatHuman({
        id: `user-${userId}`,
        userId,
        seat: 0,
        displayName,
        chips: buyIn,
      });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 409 });
    }
  }

  try {
    // Matchmaking: any seat still empty once this route is called (i.e.
    // the client's 15s countdown has elapsed) is handed to a bot so the
    // hand can begin on schedule.
    dealer.fillEmptySeatsWithBots(DEFAULT_BOT_STACK);
    dealer.startHand();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }

  return NextResponse.json({
    table: dealer.toPublicState(`user-${userId}`),
    matchmakingTimeoutMs: MATCHMAKING_TIMEOUT_MS,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tableId = searchParams.get('tableId');
  const userId = searchParams.get('userId');

  if (!tableId) {
    return NextResponse.json({ error: 'tableId query param is required.' }, { status: 400 });
  }

  const dealer = tables.get(tableId);
  if (!dealer) {
    return NextResponse.json({ error: `No active table found for "${tableId}".` }, { status: 404 });
  }

  return NextResponse.json({
    table: dealer.toPublicState(userId ? `user-${userId}` : undefined),
  });
}
