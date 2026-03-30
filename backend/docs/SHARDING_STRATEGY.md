# Database Sharding Strategy

## Overview

This document outlines the database sharding strategy implemented for horizontal scaling as the user base grows.

## Architecture

### Sharding Approach: Hash-Based Consistent Hashing

The system uses hash-based sharding with consistent hashing to distribute data across multiple database shards.

```
User ID → Hash Function → Shard ID → Database Connection
```

### Key Components

1. **ShardRouter**: Routes queries to appropriate shard based on sharding key
2. **ShardConfig**: Configuration for each shard including connection string and key range
3. **Consistent Hashing**: Ensures even distribution and minimal data movement on shard changes

## Configuration

### Environment Variables

```env
# Enable sharding
SHARDING_ENABLED=true

# Number of shards
SHARD_COUNT=4

# Sharding key (field to shard on)
SHARD_KEY=userId

# Sharding strategy (hash, range, directory)
SHARD_STRATEGY=hash

# Shard database URLs
SHARD_0_DATABASE_URL=postgresql://...
SHARD_1_DATABASE_URL=postgresql://...
SHARD_2_DATABASE_URL=postgresql://...
SHARD_3_DATABASE_URL=postgresql://...
```

## Implementation Details

### Hash Function

- Uses simple hash algorithm for key distribution
- Produces values 0-1000000
- Distributed evenly across shard key ranges

### Shard Key Ranges

For 4 shards:
- Shard 0: 0 - 249,999
- Shard 1: 250,000 - 499,999
- Shard 2: 500,000 - 749,999
- Shard 3: 750,000 - 999,999

## Usage

### Basic Query Execution

```typescript
import { shardRouter } from './config/sharding'

// Execute query on appropriate shard
const result = await shardRouter.executeOnShard(
  userId,
  'SELECT * FROM users WHERE id = $1',
  [userId]
)
```

### Shard Statistics

```typescript
const stats = await shardRouter.getShardStats()
console.log(stats)
// Output:
// {
//   shard_0: { status: 'healthy', tables: 15 },
//   shard_1: { status: 'healthy', tables: 15 },
//   ...
// }
```

## Scaling Considerations

### Adding New Shards

1. Create new database instance
2. Add SHARD_N_DATABASE_URL to environment
3. Increment SHARD_COUNT
4. Implement data migration strategy

### Data Migration

- Use consistent hashing to minimize data movement
- Implement gradual migration with dual-write pattern
- Verify data consistency before removing old shard

## Performance Characteristics

- **Read Performance**: O(1) - Direct shard lookup
- **Write Performance**: O(1) - Direct shard lookup
- **Cross-Shard Queries**: Requires fan-out to multiple shards
- **Aggregations**: May require merging results from multiple shards

## Monitoring

### Key Metrics

- Shard health status
- Query latency per shard
- Data distribution across shards
- Connection pool utilization

### Health Checks

```typescript
const health = await shardRouter.getShardStats()
```

## Limitations and Trade-offs

1. **Cross-Shard Queries**: More complex and slower
2. **Transactions**: Limited to single shard
3. **Joins**: Cannot join across shards
4. **Aggregations**: Require client-side merging

## Future Enhancements

1. Implement range-based sharding for time-series data
2. Add directory-based sharding for complex keys
3. Implement automatic shard rebalancing
4. Add cross-shard transaction support
