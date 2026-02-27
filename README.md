# HIOSOOO Dashboard

> OLT Dashboard & REST API untuk manajemen dan monitoring jaringan berbasis Go + React (Vite).

## Dashboard Preview

<p align="center">
  <img src="frontend/src/images/images1.jpg" alt="Dashboard preview 1" width="48%" />
  <img src="frontend/src/images/images2.jpg" alt="Dashboard preview 2" width="48%" />
</p>
<p align="center">
  <img src="frontend/src/images/images3.jpg" alt="Dashboard preview 3" width="48%" />
  <img src="frontend/src/images/images4.jpg" alt="Dashboard preview 4" width="48%" />
</p>

---

## Prerequisites

Pastikan tools berikut sudah terinstall sebelum mulai:

### GCC / Build Tools (wajib untuk SQLite)

Project ini menggunakan `go-sqlite3` yang membutuhkan CGO dan GCC:

```bash
sudo apt install gcc build-essential -y   # Debian/Ubuntu
sudo pacman -S base-devel                 # Arch
sudo dnf install gcc make                 # Fedora
```

> ⚠️ Tanpa GCC, build akan gagal dengan error: `go-sqlite3 requires cgo to work`

### Ringkasan Versi Minimum

| Tool          | Versi Minimum |
|---------------|---------------|
| Go            | 1.21+         |
| Node.js       | 18+           |
| npm           | 9+            |
| GCC           | any           |

---

## Quick Start (Linux)

### 1) Clone

```bash
git clone https://github.com/kroto69/HIOSOOO-DASBOR.git
cd HIOSOOO-DASBOR
```

### 2) Pilih cara jalanin

#### Opsi A (Rekomendasi): Backend + Frontend Sekaligus

```bash
chmod +x run.sh
./run.sh
```

Akses:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

> Catatan: output `run.sh` menampilkan default `3000`, tapi port backend final tetap mengikuti `configs/config.yaml` atau env `SERVER_PORT`.

---

#### Opsi B: Backend Saja

```bash
chmod +x scripts/install.sh
CGO_ENABLED=1 ./scripts/install.sh
./olt-api
```

Akses:
- Backend: `http://localhost:3000`

---

#### Opsi C: Frontend Saja (backend sudah jalan di device lain)

```bash
cp frontend/.env.example frontend/.env
```

> Edit `frontend/.env` dulu sebelum lanjut — sesuaikan `VITE_API_BASE_URL` ke alamat backend kamu (lihat bagian **Sinkronkan URL** di bawah).

```bash
npm --prefix frontend install
npm --prefix frontend run dev -- --host 0.0.0.0 --port 5173
```

Akses:
- Frontend: `http://localhost:5173`

---

## Konfigurasi

### Ubah Port Backend

Edit `configs/config.yaml`:

```yaml
server:
  host: 0.0.0.0
  port: 3003
```

Lalu restart backend.

Alternatif tanpa edit file:

```bash
SERVER_PORT=3003 ./olt-api
```

### Ubah Port Frontend (Vite)

```bash
npm --prefix frontend run dev -- --host 0.0.0.0 --port 5174
```

Akses:
- Frontend: `http://localhost:5174`

---

## Sinkronkan URL Frontend ke Backend

> ⚠️ Langkah ini **wajib** dilakukan jika kamu mengubah port backend atau mengakses dari device lain.

Edit `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Jika dashboard diakses dari device lain (HP/laptop lain), ganti dengan IP server backend:

```env
VITE_API_BASE_URL=http://192.168.1.65:3000
```

Untuk mencari IP server kamu:

```bash
ip a | grep inet
```

---

## Login Default

| Username | Password |
|----------|----------|
| `admin`  | `admin`  |

> ⚠️ **Segera ganti password setelah login pertama** untuk keamanan.

---

## Troubleshooting

### `./run.sh` tidak bisa dijalankan

```bash
chmod +x run.sh
./run.sh
```

### `vite: not found`

```bash
npm --prefix frontend install
```

### `go-sqlite3 requires cgo to work`

CGO tidak aktif atau GCC belum terinstall:

```bash
sudo apt install gcc build-essential -y
CGO_ENABLED=1 ./scripts/install.sh
```

### `Bus error (core dumped)` saat jalanin frontend

Biasanya karena versi Node.js terlalu lama atau node_modules korup:

```bash
rm -rf frontend/node_modules frontend/package-lock.json
npm --prefix frontend install
npm --prefix frontend run dev -- --host 0.0.0.0 --port 5173
```

Pastikan juga Node.js v18+:

```bash
node --version
```

### Frontend tidak bisa konek ke backend

- Pastikan backend sudah jalan
- Cek `frontend/.env` — `VITE_API_BASE_URL` harus sesuai dengan alamat & port backend
- Jika akses dari device lain, gunakan IP server bukan `localhost`

### `AUTH_JWT_SECRET not set`

Warning ini normal saat development — backend akan otomatis generate secret sementara. Untuk production, set environment variable:

```bash
AUTH_JWT_SECRET=your_secret_key ./olt-api
```

---

## API Docs

Detail endpoint ada di [`API.md`](./API.md).

---

## Tech Stack

| Layer    | Teknologi        |
|----------|------------------|
| Backend  | Go               |
| Frontend | React + Vite     |
| Database | SQLite (via CGO) |

---

## Credit

Built with AI by [@kroto69](https://github.com/kroto69).
