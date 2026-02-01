# API Integration Examples

This directory contains code examples for integrating with CineChance API.

## 📁 Examples Structure

```
examples/
├── api/                    # API integration examples
│   ├── javascript/        # JavaScript/Node.js examples
│   ├── python/            # Python examples
│   ├── curl/              # cURL command examples
│   └── postman/           # Postman collection
├── webhooks/              # Webhook examples
├── scripts/               # Utility scripts
└── sdk/                   # SDK examples (when available)
```

## 🚀 Quick Start

### JavaScript/TypeScript Example
```typescript
// examples/api/javascript/basic-usage.js
import { CineChanceAPI } from './cinechance-api';

const api = new CineChanceAPI({
  baseURL: 'https://your-domain.com/api',
  apiKey: 'your-api-key'
});

async function example() {
  // Get user's watchlist
  const watchlist = await api.getWatchlist();
  console.log('Watchlist:', watchlist);

  // Add movie to watchlist
  await api.addToWatchlist({
    tmdbId: 550,
    mediaType: 'movie',
    status: 'want',
    userRating: 8
  });

  // Get recommendations
  const recommendations = await api.getRecommendations();
  console.log('Recommendations:', recommendations);
}
```

### Python Example
```python
# examples/api/python/basic_usage.py
import requests
import json

class CineChanceAPI:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def get_watchlist(self):
        response = requests.get(
            f'{self.base_url}/watchlist',
            headers=self.headers
        )
        return response.json()
    
    def add_to_watchlist(self, movie_data):
        response = requests.post(
            f'{self.base_url}/watchlist',
            headers=self.headers,
            json=movie_data
        )
        return response.json()

# Usage
api = CineChanceAPI('https://your-domain.com/api', 'your-api-key')
watchlist = api.get_watchlist()
print(watchlist)
```

### cURL Examples
```bash
# examples/api/curl/commands.sh

# Get user watchlist
curl -X GET \
  'https://your-domain.com/api/watchlist' \
  -H 'Authorization: Bearer your-jwt-token' \
  -H 'Content-Type: application/json'

# Add movie to watchlist
curl -X POST \
  'https://your-domain.com/api/watchlist' \
  -H 'Authorization: Bearer your-jwt-token' \
  -H 'Content-Type: application/json' \
  -d '{
    "tmdbId": 550,
    "mediaType": "movie",
    "title": "Fight Club",
    "status": "want",
    "userRating": 9
  }'

# Get recommendations
curl -X GET \
  'https://your-domain.com/api/recommendations?algorithm=smart_v2&limit=10' \
  -H 'Authorization: Bearer your-jwt-token' \
  -H 'Content-Type: application/json'

# Search movies
curl -X GET \
  'https://your-domain.com/api/search?query=inception&page=1' \
  -H 'Authorization: Bearer your-jwt-token' \
  -H 'Content-Type: application/json'
```

## 🔐 Authentication Examples

### JWT Token Handling
```typescript
// examples/api/javascript/auth.js
class CineChanceAuth {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = null;
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      this.token = data.token;
      localStorage.setItem('cinechance_token', this.token);
      return data;
    }
    
    throw new Error('Login failed');
  }

  async register(email, password, name) {
    const response = await fetch(`${this.baseURL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (response.ok) {
      return this.login(email, password);
    }
    
    throw new Error('Registration failed');
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  logout() {
    this.token = null;
    localStorage.removeItem('cinechance_token');
  }
}
```

## 📊 Data Examples

### Movie Data Structure
```typescript
// examples/api/types/movie.ts
export interface Movie {
  id: number;
  title: string;
  overview: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  adult: boolean;
  originalLanguage: string;
  genres: Genre[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface WatchlistItem {
  id: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  status: 'want' | 'watched' | 'dropped';
  userRating?: number;
  addedAt: string;
  watchedDate?: string;
  note?: string;
  movie?: Movie;
}
```

### Recommendation Data
```typescript
// examples/api/types/recommendation.ts
export interface Recommendation {
  tmdbId: number;
  title: string;
  score: number;
  algorithm: string;
  reason: string;
  movie?: Movie;
}

export interface RecommendationSettings {
  minRating: number;
  preferHighRating: boolean;
  avoidRewatches: boolean;
  preferUnwatched: boolean;
  noveltyWeight: number;
  randomnessWeight: number;
  includeWant: boolean;
  includeWatched: boolean;
  includeDropped: boolean;
}
```

## 🔄 Advanced Examples

### Batch Operations
```typescript
// examples/api/javascript/batch-operations.js
class BatchOperations {
  constructor(api) {
    this.api = api;
  }

  async addMultipleMovies(movies) {
    const results = await Promise.allSettled(
      movies.map(movie => this.api.addToWatchlist(movie))
    );

    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    return {
      successful: successful.length,
      failed: failed.length,
      errors: failed.map(r => r.reason)
    };
  }

  async exportWatchlist() {
    const watchlist = await this.api.getWatchlist();
    
    const csv = this.convertToCSV(watchlist.movies);
    
    // Download as file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'watchlist.csv';
    a.click();
  }

  convertToCSV(data) {
    const headers = ['Title', 'Status', 'Rating', 'Added Date'];
    const rows = data.map(item => [
      item.title,
      item.status,
      item.userRating || '',
      item.addedAt
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}
```

### Real-time Updates
```typescript
// examples/api/javascript/realtime.js
class RealtimeUpdates {
  constructor(api) {
    this.api = api;
    this.eventSource = null;
  }

  connectToUpdates(userId) {
    this.eventSource = new EventSource(
      `${this.api.baseURL}/api/realtime/updates?userId=${userId}`
    );

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleUpdate(data);
    };

    this.eventSource.onerror = (error) => {
      console.error('Realtime connection error:', error);
      this.reconnect();
    };
  }

  handleUpdate(data) {
    switch (data.type) {
      case 'watchlist_updated':
        this.onWatchlistUpdate(data.payload);
        break;
      case 'recommendation_generated':
        this.onRecommendationUpdate(data.payload);
        break;
      case 'rating_updated':
        this.onRatingUpdate(data.payload);
        break;
    }
  }

  onWatchlistUpdate(item) {
    console.log('Watchlist updated:', item);
    // Update UI
  }

  onRecommendationUpdate(recommendations) {
    console.log('New recommendations:', recommendations);
    // Update recommendations UI
  }

  onRatingUpdate(rating) {
    console.log('Rating updated:', rating);
    // Update rating display
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  reconnect() {
    setTimeout(() => {
      console.log('Reconnecting to realtime updates...');
      this.connectToUpdates(this.userId);
    }, 5000);
  }
}
```

## 🧪 Testing Examples

### API Testing with Jest
```typescript
// examples/api/javascript/api.test.js
import { CineChanceAPI } from './cinechance-api';

describe('CineChance API', () => {
  let api;
  let testUserId;

  beforeAll(async () => {
    api = new CineChanceAPI({
      baseURL: process.env.TEST_API_URL,
      apiKey: process.env.TEST_API_KEY
    });

    // Create test user
    const user = await api.register({
      email: 'test@example.com',
      password: 'testpassword',
      name: 'Test User'
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await api.deleteUser(testUserId);
  });

  test('should get empty watchlist', async () => {
    const watchlist = await api.getWatchlist();
    expect(watchlist.movies).toHaveLength(0);
  });

  test('should add movie to watchlist', async () => {
    const movieData = {
      tmdbId: 550,
      mediaType: 'movie',
      title: 'Fight Club',
      status: 'want',
      userRating: 9
    };

    const result = await api.addToWatchlist(movieData);
    expect(result.id).toBeDefined();
    expect(result.title).toBe('Fight Club');
  });

  test('should get recommendations', async () => {
    const recommendations = await api.getRecommendations({
      algorithm: 'smart_v2',
      limit: 5
    });

    expect(recommendations.recommendations).toHaveLength(5);
    expect(recommendations.recommendations[0]).toHaveProperty('score');
  });
});
```

## 📱 Mobile App Examples

### React Native Integration
```typescript
// examples/mobile/react-native/CineChanceClient.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export class CineChanceMobileClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = null;
  }

  async loadToken() {
    this.token = await AsyncStorage.getItem('cinechance_token');
  }

  async saveToken(token) {
    this.token = token;
    await AsyncStorage.setItem('cinechance_token', token);
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        await this.handleUnauthorized();
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      Alert.alert('Error', error.message);
      throw error;
    }
  }

  async handleUnauthorized() {
    await AsyncStorage.removeItem('cinechance_token');
    this.token = null;
    Alert.alert('Session Expired', 'Please log in again');
  }

  // API methods
  async getWatchlist() {
    return this.request('/watchlist');
  }

  async addToWatchlist(movieData) {
    return this.request('/watchlist', {
      method: 'POST',
      body: JSON.stringify(movieData),
    });
  }

  async getRecommendations(options = {}) {
    const params = new URLSearchParams(options).toString();
    return this.request(`/recommendations?${params}`);
  }
}
```

## 🔌 Webhook Examples

### Webhook Handler
```typescript
// examples/webhooks/webhook-server.js
import express from 'express';
import crypto from 'crypto';

const app = express();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

app.use(express.json());

// Verify webhook signature
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-cinechance-signature'];
  const payload = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

app.post('/webhook/cinechance', verifyWebhookSignature, (req, res) => {
  const event = req.body;

  switch (event.type) {
    case 'movie.added_to_watchlist':
      handleMovieAdded(event.data);
      break;
    case 'movie.rated':
      handleMovieRated(event.data);
      break;
    case 'recommendation.generated':
      handleRecommendationGenerated(event.data);
      break;
    default:
      console.log('Unknown event type:', event.type);
  }

  res.json({ received: true });
});

function handleMovieAdded(data) {
  console.log('Movie added to watchlist:', data);
  // Send notification, update database, etc.
}

function handleMovieRated(data) {
  console.log('Movie rated:', data);
  // Update analytics, trigger recommendations, etc.
}

function handleRecommendationGenerated(data) {
  console.log('Recommendations generated:', data);
  // Send push notification, update cache, etc.
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});
```

## 📚 Additional Resources

### Documentation
- [API Reference](../docs/api.md)
- [Authentication Guide](../docs/development.md#authentication)
- [Error Handling](../docs/troubleshooting.md)

### Tools
- [Postman Collection](./postman/)
- [OpenAPI Specification](./openapi.yaml)
- [SDK Documentation](./sdk/)

### Support
- [GitHub Issues](https://github.com/your-org/CineChance/issues)
- [Discord Community](https://discord.gg/cinechance)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/cinechance)

---

*For more examples and detailed documentation, check the specific directories in this folder.*
