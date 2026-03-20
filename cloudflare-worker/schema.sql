-- Cloudflare D1 Database Schema for Onramper Webhooks
-- 
-- Instructions:
-- 1. In your Cloudflare Dashboard, go to "Workers & Pages" -> "D1 SQL Database"
-- 2. Create a new database (e.g., "onramper-db")
-- 3. Open the database console and paste this exact SQL command to create the table.

CREATE TABLE IF NOT EXISTS webhook_events (
    transactionId TEXT PRIMARY KEY,
    country TEXT,
    inAmount REAL,
    onramp TEXT,
    onrampTransactionId TEXT,
    outAmount REAL,
    paymentMethod TEXT,
    partnerContext TEXT,
    sourceCurrency TEXT,
    status TEXT,
    statusReason TEXT,
    statusDate TEXT,
    targetCurrency TEXT,
    transactionType TEXT,
    transactionHash TEXT,
    walletAddress TEXT,
    isRecurringPayment INTEGER
);
