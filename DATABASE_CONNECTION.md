# Database Connection Information

## Session Pooler Connection (Recommended)

### Connection String
```bash
env PGPASSWORD="ranana-11532." psql "host=db.bddqkmnbbvllpvsynklr.supabase.co port=6543 dbname=postgres user=postgres sslmode=require"
```

### Schema Check
```bash
env PGPASSWORD="ranana-11532." psql "host=db.bddqkmnbbvllpvsynklr.supabase.co port=6543 dbname=postgres user=postgres sslmode=require" -c "\d session_contents"
```

### Version Check
```bash
env PGPASSWORD="ranana-11532." psql "host=db.bddqkmnbbvllpvsynklr.supabase.co port=6543 dbname=postgres user=postgres sslmode=require" -c "SELECT version();"
```

### Database Information (Session Pooler)
- **Version**: PostgreSQL 17.6 (aarch64-unknown-linux-gnu)
- **Host**: db.bddqkmnbbvllpvsynklr.supabase.co
- **Port**: 6543 (Supavisor Session Pooler)
- **Database**: postgres
- **User**: postgres
- **SSL**: Required

## Connection Requirements

### VPN Required (IPv6 Access Issue)
**ISP blocks IPv6 connection to Supabase**. Use one of these solutions:

1. **Cloudflare WARP (Recommended - Free)**
   - Download: https://1.1.1.1/
   - Install Windows version
   - Click "WARP" button to enable
   - Verify: `Test-NetConnection -ComputerName db.bddqkmnbbvllpvsynklr.supabase.co -Port 6543`

2. **Mobile Tethering (Alternative)**
   - Use smartphone as hotspot
   - Connect PC to tethering network
   - Supabase connection will work normally

### Connection Test
```powershell
# Windows PowerShell - Verify VPN/Tethering works
Test-NetConnection -ComputerName db.bddqkmnbbvllpvsynklr.supabase.co -Port 6543
```

Expected result with WARP:
- TcpTestSucceeded : True
- InterfaceAlias : CloudflareWARP

## PostgreSQL Direct Connection (Legacy - IPv6 Only)

### Connection String
```bash
PGPASSWORD="ranana-11532." psql "postgresql://postgres:ranana-11532.@db.bddqkmnbbvllpvsynklr.supabase.co:5432/postgres"
```

**Note**: Direct connection (port 5432) requires IPv6 and may not work due to ISP restrictions. Use Session Pooler (port 6543) instead.

---

**Note**: This file contains sensitive connection information. Ensure it's properly secured and not exposed in public repositories.