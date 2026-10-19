#!/usr/bin/env node

const http = require('http');
const { performance } = require('perf_hooks');

const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
const targetShopSlug = process.env.TARGET_SHOP_SLUG || 'demo-shop';

// Configuration
const config = {
  startVUs: 20,
  stages: [
    { duration: 120000, target: 200 },  // 2 min to 200 VUs
    { duration: 180000, target: 600 },  // 3 min to 600 VUs
    { duration: 300000, target: 1000 }, // 5 min to 1000 VUs
    { duration: 120000, target: 0 },    // 2 min ramp down
  ],
  thresholds: {
    failureRate: 0.02, // 2%
    p95Latency: 900,   // 900ms
    p99Latency: 1500,  // 1500ms
  }
};

class LoadTestRunner {
  constructor() {
    this.results = [];
    this.activeRequests = 0;
    this.totalRequests = 0;
    this.failedRequests = 0;
    this.latencies = [];
  }

  async makeRequest(path) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      const req = http.get(`${baseUrl}${path}`, {
        headers: {
          'Accept': 'application/json',
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const endTime = performance.now();
          const latency = endTime - startTime;
          
          this.latencies.push(latency);
          this.totalRequests++;
          
          if (res.statusCode >= 500) {
            this.failedRequests++;
          }
          
          resolve({
            statusCode: res.statusCode,
            latency,
            success: res.statusCode < 500
          });
        });
      });

      req.on('error', () => {
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        this.latencies.push(latency);
        this.totalRequests++;
        this.failedRequests++;
        
        resolve({
          statusCode: 0,
          latency,
          success: false
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        this.latencies.push(latency);
        this.totalRequests++;
        this.failedRequests++;
        
        resolve({
          statusCode: 0,
          latency,
          success: false
        });
      });
    });
  }

  async runVirtualUser(duration) {
    const endTime = Date.now() + duration;
    const endpoints = ['/api/health', '/api/v1/shops?take=24&skip=0', `/api/v1/shops/${targetShopSlug}`];
    
    while (Date.now() < endTime) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      await this.makeRequest(endpoint);
      
      // Sleep between requests (1-3 seconds)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
  }

  calculateStats() {
    if (this.latencies.length === 0) return { p95: 0, p99: 0 };
    
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    
    return {
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0,
      avg: sorted.reduce((a, b) => a + b, 0) / sorted.length
    };
  }

  async run() {
    console.log(`🚀 Starting load test against ${baseUrl}`);
    console.log(`📊 Target shop: ${targetShopSlug}`);
    console.log(`⏱️  Total duration: ${config.stages.reduce((acc, stage) => acc + stage.duration, 0) / 1000}s`);
    
    let currentVUs = config.startVUs;
    
    for (const stage of config.stages) {
      console.log(`\n📈 Ramping to ${stage.target} VUs over ${stage.duration / 1000}s...`);
      
      const rampUpTime = stage.duration;
      const rampInterval = 5000; // Check every 5 seconds
      const vUsPerInterval = (stage.target - currentVUs) / (rampUpTime / rampInterval);
      
      const stageStartTime = Date.now();
      let activeUsers = [];
      
      while (Date.now() - stageStartTime < rampUpTime) {
        const targetVUs = Math.round(currentVUs + vUsPerInterval);
        const usersToAdd = Math.max(0, targetVUs - activeUsers.length);
        
        for (let i = 0; i < usersToAdd; i++) {
          const userPromise = this.runVirtualUser(rampUpTime);
          activeUsers.push(userPromise);
        }
        
        currentVUs = targetVUs;
        
        // Print progress
        const stats = this.calculateStats();
        const failureRate = this.totalRequests > 0 ? (this.failedRequests / this.totalRequests) : 0;
        
        console.log(`  🔄 VUs: ${activeUsers.length} | Requests: ${this.totalRequests} | Failures: ${(failureRate * 100).toFixed(2)}% | p95: ${stats.p95.toFixed(0)}ms`);
        
        await new Promise(resolve => setTimeout(resolve, rampInterval));
      }
      
      // Wait for all users to complete
      await Promise.all(activeUsers);
      activeUsers = [];
    }
    
    // Final stats
    const finalStats = this.calculateStats();
    const finalFailureRate = this.totalRequests > 0 ? (this.failedRequests / this.totalRequests) : 0;
    
    console.log('\n📊 Load Test Results:');
    console.log(`  Total Requests: ${this.totalRequests}`);
    console.log(`  Failed Requests: ${this.failedRequests}`);
    console.log(`  Failure Rate: ${(finalFailureRate * 100).toFixed(2)}%`);
    console.log(`  Average Latency: ${finalStats.avg.toFixed(0)}ms`);
    console.log(`  p95 Latency: ${finalStats.p95.toFixed(0)}ms`);
    console.log(`  p99 Latency: ${finalStats.p99.toFixed(0)}ms`);
    
    // Check thresholds
    console.log('\n✅ Threshold Check:');
    const failureRateOk = finalFailureRate <= config.thresholds.failureRate;
    const p95Ok = finalStats.p95 <= config.thresholds.p95Latency;
    const p99Ok = finalStats.p99 <= config.thresholds.p99Latency;
    
    console.log(`  Failure Rate < ${(config.thresholds.failureRate * 100)}%: ${failureRateOk ? '✅' : '❌'}`);
    console.log(`  p95 < ${config.thresholds.p95Latency}ms: ${p95Ok ? '✅' : '❌'}`);
    console.log(`  p99 < ${config.thresholds.p99Latency}ms: ${p99Ok ? '✅' : '❌'}`);
    
    const allPassed = failureRateOk && p95Ok && p99Ok;
    console.log(`\n${allPassed ? '🎉 All thresholds passed!' : '❌ Some thresholds failed!'}`);
    
    process.exit(allPassed ? 0 : 1);
  }
}

// Run the test
const runner = new LoadTestRunner();
runner.run().catch(err => {
  console.error('❌ Load test failed:', err);
  process.exit(1);
});
