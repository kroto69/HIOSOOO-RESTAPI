# OLT API Documentation

Base URL: `http://localhost:3000`

---

## Device Management

### Create/Update Device
```http
POST http://localhost:3000/api/v1/devices
Content-Type: application/json

{
  "id": "olt-001",
  "name": "OLT KROTO",
  "base_url": "http://192.168.1.100",
  "port": 80,
  "username": "admin",
  "password": "admin"
}
```

### List All Devices
```http
GET http://localhost:3000/api/v1/devices
```

### Get Device Detail
```http
GET http://localhost:3000/api/v1/devices/:id
```

### Delete Device
```http
DELETE http://localhost:3000/api/v1/devices/:id
```

### Delete All Devices
```http
DELETE http://localhost:3000/api/v1/devices
```

### Check Device Status
```http
GET http://localhost:3000/api/v1/devices/:id/status
```

---

## PON Operations

### Get PON List
```http
GET http://localhost:3000/api/v1/devices/:id/pons
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
```http
GET http://localhost:3000/api/v1/devices/:id/pons/:pon_id/onus
GET http://localhost:3000/api/v1/devices/:id/pons/:pon_id/onus?filter=online
```

| Parameter | Description |
|-----------|-------------|
| `:pon_id` | PON number (e.g., `1` for PON 0/1) |
| `filter` | Optional: `online`, `offline` |

### Get ONU Detail
```http
GET http://localhost:3000/api/v1/devices/:id/onus/:onu_id
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
```http
PUT http://localhost:3000/api/v1/devices/:id/onus/:onu_id
Content-Type: application/json

{
  "name": "NAMA BARU"
}
```

### Reboot ONU
```http
POST http://localhost:3000/api/v1/devices/:id/onus/:onu_id/action
Content-Type: application/json

{
  "action": "reboot"
}
```

**Note:** Nama ONU akan dipertahankan selama reboot.

### Delete ONU
```http
DELETE http://localhost:3000/api/v1/devices/:id/onus/:onu_id
```

---

## System Operations

### Get System Info
```http
GET http://localhost:3000/api/v1/devices/:id/system
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
```http
POST http://localhost:3000/api/v1/devices/:id/save-config
```

### Get ONU Logs
```http
GET http://localhost:3000/api/v1/devices/:id/logs?limit=100
```

---

## Health Check

```http
GET http://localhost:3000/health
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
