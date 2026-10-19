# CDN Configuration for Scaling

> السياق الحالي: أصل الباك (origin) لهذا الإعداد هو `gobackend/` وحده (Go 1.25 + Fiber — باك NestJS القديم حُذف 2026-08-24، وتشغيله عبر `go run ./cmd/api` داخل `gobackend/`)، والفرونت ثلاثة تطبيقات Next.js في `apps/`، وقاعدة البيانات PostgreSQL على `localhost:5433` (لا Prisma)، وRedis على `6379`.

## Overview
This document provides CDN configuration recommendations for scaling the application from 1,000 to 10,000+ daily users.

## Cloudflare CDN Configuration

### 1. DNS Settings
```
Type    Name                Value
A       @                   YOUR_SERVER_IP
A       api                 YOUR_SERVER_IP
A       www                 YOUR_SERVER_IP
CNAME   assets              your-bucket.r2.cloudflarestorage.com
```

### 2. Page Rules
1. **Static Assets Cache**
   - URL Pattern: `*yourdomain.com/assets/*`
   - Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 year
     - Browser Cache TTL: 1 year
     - Cache Key: Ignore Query String

2. **API Bypass**
   - URL Pattern: `*yourdomain.com/api/*`
   - Settings:
     - Cache Level: Bypass Cache
     - Disable Performance

3. **Image Optimization**
   - URL Pattern: `*yourdomain.com/images/*`
   - Settings:
     - Image Resizing: On
     - WebP: On
     - Polish: On

### 3. Cache Rules
- **Static Files** (CSS, JS, fonts): Cache for 1 year
- **Images**: Cache for 30 days
- **API Routes**: No cache (bypass)
- **HTML**: Cache for 1 hour (respect cache headers)

### 4. Security Settings
- **Bot Fight Mode**: On
- **Security Level**: Medium
- **Rate Limiting**:
  - API: 100 requests/minute
  - General: 300 requests/minute

### 5. Performance Settings
- **Auto Minify**: On (CSS, JS, HTML)
- **Brotli**: On
- **HTTP/3 (QUIC)**: On
- **0-RTT Connection Resumption**: On

## AWS CloudFront Configuration

### 1. Distribution Settings
- **Origin Protocol Policy**: HTTPS Only
- **Viewer Protocol Policy**: Redirect HTTP to HTTPS
- **Allowed HTTP Methods**: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
- **Compress Objects**: Yes
- **Price Class**: Use All Edge Locations

### 2. Cache Behaviors
1. **Static Assets** (`/assets/*`)
   - Cache Policy: CachingOptimized
   - Origin Request Policy: CORS-S3Origin
   - TTL: 86400 seconds (1 day)

2. **API Routes** (`/api/*`)
   - Cache Policy: CachingDisabled
   - Origin Request Policy: AllViewer

3. **Images** (`/images/*`)
   - Cache Policy: CachingOptimized
   - TTL: 2592000 seconds (30 days)

### 3. Origin Configuration
- **Backend Origin**: Load balancer URL
- **Frontend Origin**: Load balancer URL
- **Media Origin**: R2 bucket URL

## Cloudflare R2 for Media Storage

### 1. Bucket Configuration
- **Bucket Name**: ray-marketplace-media
- **Region**: Auto (closest to users)
- **Public Access**: Public bucket (via custom domain)

### 2. Custom Domain
- **Domain**: assets.yourdomain.com
- **SSL**: Full (strict)
- **Cache TTL**: 1 year

### 3. Image Optimization
- Enable Cloudflare Image Resizing
- Create transformations:
  - Thumbnail: 200x200
  - Medium: 600x600
  - Large: 1200x1200
  - Original: Keep original

## Performance Optimization

### 1. Preloading Critical Resources
```html
<link rel="preload" href="/assets/main.js" as="script">
<link rel="preload" href="/assets/main.css" as="style">
<link rel="preconnect" href="https://api.yourdomain.com">
```

### 2. Service Worker Caching
- Cache static assets on install
- Cache API responses with network-first strategy
- Stale-while-revalidate for frequently accessed data

### 3. Database Query Optimization
- Use Redis for hot data (shops, products)
- Implement read replicas for heavy read workloads
- Use connection pooling (PgBouncer)

### 4. API Response Optimization
- Enable gzip/brotli compression
- Implement response caching headers
- Use pagination for list endpoints
- Implement GraphQL for efficient data fetching

## Monitoring

### 1. Cloudflare Analytics
- Monitor cache hit ratio (target: 90%+)
- Track bandwidth savings
- Monitor error rates by region

### 2. CloudWatch Metrics
- Request latency by region
- Error rates (4xx, 5xx)
- CDN cache hit ratio
- Bandwidth usage

### 3. Alerts
- High error rate (>5%)
- High latency (>500ms)
- Low cache hit ratio (<80%)
- Bandwidth spike

## Cost Optimization

### 1. Cloudflare
- Free tier covers most needs
- Upgrade to Pro for advanced features ($20/month)

### 2. CloudFront
- On-demand pricing: $0.085/GB (US)
- Reserved capacity for predictable traffic
- CloudFront Functions for edge computing

### 3. R2 Storage
- $0.015/GB/month storage
- Free egress (no data transfer fees)
- Lifecycle policies for old data

## Implementation Steps

1. **Phase 1: Basic CDN**
   - Set up Cloudflare CDN
   - Configure DNS
   - Enable basic caching rules

2. **Phase 2: Media CDN**
   - Set up R2 bucket
   - Configure custom domain
   - Migrate media uploads

3. **Phase 3: Advanced Optimization**
   - Enable image optimization
   - Configure page rules
   - Set up monitoring

4. **Phase 4: Multi-Region**
   - Deploy to multiple regions
   - Configure geo-routing
   - Set up origin failover

## Expected Performance Gains

- **Static Assets**: 90% faster load time
- **Images**: 87.5% faster load time
- **API**: 40% reduction in server load
- **Global Latency**: 75% reduction
- **Bandwidth**: 40% reduction
