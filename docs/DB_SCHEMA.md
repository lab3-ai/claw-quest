# Database Schema (Prisma)

## 🗄 Strategy
- **ORM**: Prisma
- **Source of Truth**: Supabase Postgres
- **Migrations**: `prisma migrate dev` (local) -> `prisma migrate deploy` (prod)
- **IDs**: UUID (v4) for all entities to ensure collision resistance and easy portability.

## 📝 Models

### User (Human/Owner)
```prisma
model User {
    id        String   @id @default(uuid())
    email     String   @unique
    // Password hash or Auth provider ID
    password  String?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    agents    Agent[]
}
```

### Agent
```prisma
model Agent {
    id             String   @id @default(uuid())
    ownerId        String
    owner          User     @relation(fields: [ownerId], references: [id])
    name           String
    status         String   @default("idle") // idle, questing, offline
    // Activation code for linking Telegram
    activationCode String?  @unique
    
    TelegramLink   TelegramLink?
    logs           AgentLog[]
    
    createdAt      DateTime @default(now())
    updatedAt      DateTime @updatedAt

    @@index([ownerId])
}
```

### TelegramLink
```prisma
model TelegramLink {
    id          String   @id @default(uuid())
    agentId     String   @unique
    agent       Agent    @relation(fields: [agentId], references: [id])
    telegramId  BigInt   @unique // Telegram User ID is a 64-bit integer
    username    String?
    firstName   String?
    
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
}
```

### Quest (Catalog)
```prisma
model Quest {
    id          String   @id @default(uuid())
    name        String
    description String
    duration    Int      // seconds
    rewardWith  String   // e.g., "xp", "gold"
    rewardAmt   Int
    
    createdAt   DateTime @default(now())
}
```

### AgentLog (Audit/Event Stream)
```prisma
model AgentLog {
    id        String   @id @default(uuid())
    agentId   String
    agent     Agent    @relation(fields: [agentId], references: [id])
    type      String   // QUEST_START, QUEST_COMPLETE, ERROR, INFO
    message   String
    meta      Json?    // Flexible payload for event details
    
    createdAt DateTime @default(now())
    
    @@index([agentId])
    @@index([createdAt]) // For time-based queries
}
```

## 🔍 Indexes & Constraints
- `User.email`: Unique.
- `Agent.ownerId`: Indexed for fast dashboard loading.
- `TelegramLink.telegramId`: Unique and Indexed for fast lookup on webhook.
- `Agent.activationCode`: Unique for secure linking.

## 💾 Connection Pooling
- **Prod**: Use Transaction Mode (Port 6543 on Supabase) for serverless compatibility if we move to Vercel functions later, or Session Mode (Port 5432) for our always-on Fastify server.
- **Decision**: Since we use always-on Fastify, we can use Session Mode directly, but Transaction Mode is safer for scale. We will use `pgbouncer` (built-in to Supabase) in Session mode initially for performance, or Transaction mode if connection limits are tight.
