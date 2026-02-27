# EXAMPLE USAGE OLT API Documentation

Base URL: `http://localhost:3000`

---

## Authentication

### Login
```bash
curl -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-password"
  }'
```

### Current User
```bash
curl "http://localhost:3000/api/v1/auth/me" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Change Password
```bash
curl -X POST "http://localhost:3000/api/v1/auth/change-password" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "old-password",
    "new_password": "new-strong-password"
  }'
```

**Important:** All `/api/v1/devices/*` endpoints now require `Authorization: Bearer <ACCESS_TOKEN>`.

---

## Activity Audit Logs

Semua aktivitas penting user dicatat otomatis, termasuk:
- login sukses / gagal
- reboot ONU
- update nama ONU
- perubahan password user
- CRUD device

### List Audit Logs (Admin only)
```bash
curl "http://localhost:3000/api/v1/audit-logs?limit=100" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Optional query params:
- `limit` (default `100`, max `500`)
- `user_id`
- `username`
- `action`
- `resource`

---

## Device Management

### Create/Update Device
```bash
curl -X POST "http://localhost:3000/api/v1/devices" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "olt-001",
    "name": "OLT KROTO",
    "base_url": "http://192.168.96.100",
    "port": 80,
    "username": "admin",
    "password": "admin"
  }'
```

### List All Devices
```bash
curl "http://localhost:3000/api/v1/devices" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Get Device Detail
```bash
curl "http://localhost:3000/api/v1/devices/olt-1" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Delete Device
```bash
curl -X DELETE "http://localhost:3000/api/v1/devices/olt-1" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Delete All Devices
```bash
curl -X DELETE "http://localhost:3000/api/v1/devices" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Check Device Status
```bash
curl "http://localhost:3000/api/v1/devices/olt-1/status" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## PON Operations

### Get PON List
```bash
curl "http://localhost:3000/api/v1/devices/olt-1/pons" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response:**
```json
{
  "data": [
    {"pon_id": "1", "full_id": "0/1", "info": "N/A"},
    {"pon_id": "2", "full_id": "0/2", "info": "N/A"}
  ]
}
```

---

## ONU Operations

### Get ONUs by PON
```bash
# Get all ONUs on PON 1
curl "http://localhost:3000/api/v1/devices/olt-1/pons/1/onus" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# Get only online ONUs
curl "http://localhost:3000/api/v1/devices/olt-1/pons/1/onus?filter=online" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

| Parameter | Description |
|-----------|-------------|
| `:pon_id` | PON number (e.g., `1` for PON 0/1) |
| `filter` | Optional: `online`, `offline` |

### Get ONU Detail
```bash
curl "http://localhost:3000/api/v1/devices/olt-1/onus/1:1" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

| Parameter | Description |
|-----------|-------------|
| `:onu_id` | Format `pon:onu` (e.g., `1:4` for ONU 4 on PON 1) |

### Get ONU Traffic Counter
```bash
curl "http://localhost:3000/api/v1/devices/olt-1/onus/1:1/traffic" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response:**
```json
{
  "data": {
    "onu_id": "0/1:4",
    "name": " PRARORO",
    "mac_address": "6C:D2:B3:D3:A8:B9",
    "status": "Up",
    "first_uptime": "2026-01-21 16:14:18",
    "last_uptime": "2026-02-06 11:26:01",
    "optical_module": {
      "temperature": 46.00,
      "tx_power": 5.08,
      "rx_power": -15.78
    }
  }
}
```

### Update ONU Name
```bash
curl -X PUT "http://localhost:3000/api/v1/devices/olt-1/onus/1:1" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "JOKOWOW"}'
```

### Reboot ONU
```bash
curl -X POST "http://localhost:3000/api/v1/devices/olt-1/onus/1:1/action" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"action": "reboot"}'
```

**Note:** Nama ONU akan dipertahankan selama reboot.

### Delete ONU
```bash
curl -X DELETE "http://localhost:3000/api/v1/devices/olt-1/onus/1:1" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## System Operations

### Get System Info
```bash
curl "http://localhost:3000/api/v1/devices/olt-1/system" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response:**
```json
{
  "data": {
    "system_name": "EPON",
    "switch_type": "OLT",
    "software_version": "V2.3.1",
    "mac_address": "A8:BC:78:AB:BC:CD",
    "ip_address": "192.168.96.100",
    "uptime": "7 hours 28 minutes 11 seconds"
  }
}
```

### Save Configuration
```bash
curl -X POST "http://localhost:3000/api/v1/devices/olt-1/save-config" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Get ONU Logs
```bash
curl "http://localhost:3000/api/v1/devices/olt-1/logs?limit=100" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## Health Check

```bash
curl "http://localhost:3000/health"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "olt-api",
    "status": "healthy",
    "version": "1.0.0"
  }
}
```

---

## Error Responses

All errors return:
```json
{
  "success": false,
  "error": "Error message"
}
```

| Status Code | Description |
|-------------|-------------|
| 401 | Unauthorized - Invalid or missing bearer token |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |
