# 🧠 Enhanced Espen D6 MCP Server Brief

## 🎯 Objective

Develop a **multi-tenant MCP (Model Context Protocol) server** for Espen.ai that integrates securely with the **D6 School Information System**, structures academic data into a standardized learner context, and serves this to EspenTutor, EspenTeacher, and EspenParent via an authenticated API.

### Key Enhancements:
- ✅ **Performance-optimized** Supabase schema with proper indexing
- ✅ **Context caching** for sub-second MCP response times  
- ✅ **Comprehensive sync logging** for D6 API reliability
- ✅ **Enhanced attendance tracking** beyond just absences
- ✅ **Utility functions** for calculated metrics (averages, percentages)
- ✅ **Auto-cleanup** for expired cache entries

---

## 🧱 Project Structure

```
espen-d6-mcp-server/
│
├── /src
│   ├── /api
│   │   ├── context.ts              # GET /context/:user_id
│   │   ├── d6-sync.ts              # Manual re-fetch from D6
│   │   ├── health.ts               # Health check endpoint
│   │   ├── context.ts              # MCP context types
│   │   ├── database.ts             # Database schema types
│   ├── /services
│   │   ├── d6Client.ts             # API wrappers for D6 endpoints
│   │   ├── contextBuilder.ts       # Transforms D6 data into MCP context
│   │   ├── cacheManager.ts         # Redis/memory cache for performance
│   ├── /middleware
│   │   ├── auth.ts                 # JWT auth + role validation
│   │   ├── tenantScope.ts          # Ensures per-tenant isolation
│   │   ├── rateLimiter.ts          # API rate limiting per tenant
│   ├── /db
│   │   ├── client.ts               # Supabase integration
│   │   ├── schema.sql              # Enhanced DB schema with tenant scoping
│   │   ├── migrations/             # Database migration files
│   ├── /utils
│   │   ├── logger.ts               # Logging utilities
│   │   ├── validateInput.ts        # Schema validation (Zod)
│   │   ├── metrics.ts              # Calculated academic metrics
│   ├── /tests
│   │   ├── api/                    # API endpoint tests
│   │   ├── services/               # Service layer tests
│   │   ├── integration/            # Full integration tests
│   ├── /types
│   │   ├── d6.ts                   # D6 API response types
│   │   ├── context.ts              # MCP context types
│   │   ├── database.ts             # Database schema types
│
├── .env.example
├── .env
├── README.md
├── package.json
├── tsconfig.json
├── vercel.json
└── docker-compose.yml              # Local development setup
```

---

## 🔌 D6 API Integration Overview

| Endpoint                    | Purpose                                        | Cache TTL |
|----------------------------|------------------------------------------------|-----------|
| `GET /learners`            | Basic profile: name, grade, language           | 1 hour    |
| `GET /learnersubjectsperterm` | Enrolled subjects per term                  | 6 hours   |
| `GET /learnersubjectmarks` | Subject marks per term                        | 30 minutes|
| `GET /learnerabsentees`    | Attendance gaps                               | 15 minutes|
| `GET /learnerdiscipline`   | Behavior indicators                           | 1 hour    |
| `GET /staffmembers`        | Teacher metadata                              | 24 hours  |
| `GET /parents`             | Parent contact info                           | 12 hours  |

Each call contributes to the unified `/context/:user_id` response that powers EspenTutor's personalization.

---

## 🔐 Multi-Tenant & Security Strategy

- Each **user** (teacher, learner, parent) must be scoped by `school_id` (tenant).
- Use **JWT** tokens to validate identity and isolate access.
- Supabase's **RLS** (Row-Level Security) will protect database rows per tenant.

---

## 📊 Enhanced Database Schema Features

### Key Improvements Over Original:
1. **Performance Indexes** - Composite indexes for common query patterns
2. **Cache Tables** - Dedicated tables for context caching with TTL
3. **Audit Logging** - Full sync history and error tracking
4. **Calculated Fields** - Pre-computed averages, percentages, rankings
5. **Attendance Enhancement** - Beyond absences: late arrivals, early departures
6. **Subject Hierarchies** - Support for subject categories and learning areas

### Core Tables:
- `tenants` - School information with D6 connection metadata
- `users` - Multi-role users (learner/teacher/parent) with tenant scoping
- `learners` - Enhanced learner profiles with calculated metrics
- `subjects` - Subject hierarchy with categories and learning areas  
- `marks` - Marks with term context and calculated statistics
- `attendance` - Comprehensive attendance tracking
- `discipline` - Behavior tracking with severity levels
- `context_cache` - Pre-built MCP contexts with TTL
- `sync_logs` - Full audit trail of D6 API interactions

---

## 🚀 Implementation Phases

### Phase 0: Project Setup (Day 1)
- [x] Enhanced Supabase schema deployment
- [x] Node.js/TypeScript project initialization
- [ ] Docker development environment
- [ ] Basic authentication middleware
- [ ] Health check endpoints

### Phase 1: D6 Integration (Days 2-3)
- [ ] D6 API client with retry logic
- [ ] Data transformation pipelines
- [ ] Tenant-scoped data synchronization
- [ ] Error handling and logging
- [ ] Integration tests

### Phase 2: MCP Context API (Days 4-5)
- [ ] Context builder service
- [ ] Performance-optimized queries
- [ ] Cache layer implementation
- [ ] Rate limiting and security
- [ ] API documentation

### Phase 3: Testing & Optimization (Days 6-7)
- [ ] Comprehensive test suite
- [ ] Performance benchmarking
- [ ] Security penetration testing
- [ ] Cache optimization
- [ ] Monitoring setup

### Phase 4: Deployment (Day 8)
- [ ] Vercel deployment configuration
- [ ] Environment variable setup
- [ ] Production monitoring
- [ ] Documentation completion
- [ ] Client integration guide

---

## 🏗️ Technical Stack

**Backend**: Node.js + TypeScript + Fastify
**Database**: Supabase (PostgreSQL) + Redis (caching)
**Authentication**: JWT + Supabase Auth
**Deployment**: Vercel (serverless functions)
**Testing**: Jest + Supertest
**Monitoring**: Supabase Analytics + Custom metrics

---

## 🎯 Success Metrics

- **Response Time**: < 200ms for cached contexts
- **Uptime**: 99.9% availability
- **Security**: Zero data leaks between tenants
- **Performance**: Support 1000+ concurrent users per school
- **Data Freshness**: Real-time updates within 15 minutes

---

## 📋 Next Steps

1. **Initialize Project**: Set up the folder structure and core dependencies ✅
2. **Deploy Schema**: Apply enhanced database schema to Supabase
3. **D6 Integration**: Build and test API clients for all endpoints
4. **Context Builder**: Implement the core MCP context generation
5. **Security Layer**: Add authentication and tenant isolation
6. **Performance**: Implement caching and optimization
7. **Testing**: Build comprehensive test coverage
8. **Deployment**: Configure production environment

This enhanced brief provides a solid foundation for building a production-ready, multi-tenant MCP server that integrates seamlessly with D6 and delivers optimal performance for Espen.ai's educational applications. 