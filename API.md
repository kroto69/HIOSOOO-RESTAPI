# EXAMPLE USAGE OLT API Documentation

Base URL: `http://localhost:3000`

---

## Device Management

### Create/Update Device
```bash
curl -X POST "http://localhost:3000/api/v1/devices" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "olt-001",
    "name": "OLT KROTO",
    "base_url": "http://192.168.1.100",
    "port": 80,
    "username": "admin",
    "password": "admin"
  }'
```

### List All Devices
```bash
curl "http://localhost:3000/api/v1/devices"
```

### Get Device Detail
```bash
curl "http://localhost:3000/api/v1/devices/olt-1"
```

### Delete Device
```bash
curl -X DELETE "http://localhost:3000/api/v1/devices/olt-1"
```

### Delete All Devices
```bash
curl -X DELETE "http://localhost:3000/api/v1/devices"
```

### Check Device Status
```bash
curl "http://localhost:3000/api/v1/devices/olt-1/status"
```

---

## PON Operations

### Get PON List
```bash
curl "http://localhost:3000/api/v1/devices/olt-1/pons"
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
curl "http://localhost:3000/api/v1/devices/olt-1/pons/1/onus"

# Get only online ONUs
curl "http://localhost:3000/api/v1/devices/olt-1/pons/1/onus?filter=online"
```

| Parameter | Description |
|-----------|-------------|
| `:pon_id` | PON number (e.g., `1` for PON 0/1) |
| `filter` | Optional: `online`, `offline` |

### Get ONU Detail
```bash
curl "http://localhost:3000/api/v1/devices/olt-1/onus/1:1"
```

| Parameter | Description |
|-----------|-------------|
| `:onu_id` | Format `pon:onu` (e.g., `1:4` for ONU 4 on PON 1) |

**Response:**
```json
{
  "data": {
    "onu_id": "0/1:4",
    "name": "PELANGGAN",
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
  -H "Content-Type: application/json" \
  -d '{"name": "NAMABARU"}'
```

### Reboot ONU
```bash
curl -X POST "http://localhost:3000/api/v1/devices/olt-1/onus/1:1/action" \
  -H "Content-Type: application/json" \
  -d '{"action": "reboot"}'
```

**Note:** Nama ONU akan dipertahankan selama reboot.

### Delete ONU
```bash
curl -X DELETE "http://localhost:3000/api/v1/devices/olt-1/onus/1:1"
```

---

## System Operations

### Get System Info
```bash
curl "http://localhost:3000/api/v1/devices/olt-1/system"
```

**Response:**
```json
{
  "data": {
    "system_name": "EPON",
    "switch_type": "OLT",
    "software_version": "V2.3.1",
    "mac_address": "78:5C:72:A2:B0:B4",
    "ip_address": "10.17.0.7",
    "uptime": "7 hours 28 minutes 11 seconds"
  }
}
```

### Save Configuration
```bash
curl -X POST "http://localhost:3000/api/v1/devices/olt-1/save-config"
```

### Get ONU Logs
```bash
curl "http://localhost:3000/api/v1/devices/olt-1/logs?limit=100"
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
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |
