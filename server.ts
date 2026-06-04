import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import mime from "mime-types";
import Database from "better-sqlite3";
import { spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    console.log(`[API Request] ${req.method} ${req.url}`);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session helper for validation
function isValidSession(token: string): boolean {
  try {
    const session = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
    return !!session;
  } catch (err) {
    return false;
  }
}

// Authentication Middleware
app.use((req, res, next) => {
  // Only target /api/ requests
  if (!req.path.startsWith("/api/")) {
    return next();
  }

  // Exclude login, health, and stream media requests from authentication checks
  if (
    req.path === "/api/auth/login" ||
    req.path === "/api/health" ||
    req.path.startsWith("/api/video/")
  ) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token || !isValidSession(token)) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired session" });
  }

  next();
});

// Configuration from environment variables
let DATA_DIR = process.env.DATA_DIR || __dirname;
const UPLOAD_DIR_NAME = process.env.UPLOAD_DIR_NAME || "uploads";

// Ensure DATA_DIR exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created DATA_DIR: ${DATA_DIR}`);
  }
} catch (err) {
  console.error(`Error creating DATA_DIR (${DATA_DIR}):`, err);
  // Fallback to current directory if specified DATA_DIR is not writable
  if (DATA_DIR !== __dirname) {
    console.warn("Falling back to current directory for data storage.");
    DATA_DIR = __dirname;
  }
}

const DB_PATH = path.join(DATA_DIR, process.env.DB_NAME || "streaming.db");
const uploadDir = path.join(DATA_DIR, UPLOAD_DIR_NAME);

// Storage Limit (Default 500GB if not specified)
const STORAGE_LIMIT_GB = parseInt(process.env.STORAGE_LIMIT_GB || "500");
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_GB * 1024 * 1024 * 1024;

// Database setup
let db: Database.Database;
try {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL'); // Enable WAL mode for better concurrency
  console.log(`[Database] Connected to ${DB_PATH} (WAL mode enabled)`);
} catch (err) {
  console.error(`[Database] Failed to connect to ${DB_PATH}:`, err);
  console.warn("[Database] Falling back to in-memory database for safety.");
  db = new Database(":memory:");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    original_name TEXT,
    path TEXT,
    size INTEGER DEFAULT 0,
    duration REAL DEFAULT 0,
    resolution TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS streams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_number INTEGER UNIQUE,
    video_id INTEGER,
    rtmp_url TEXT DEFAULT 'rtmps://a.rtmp.youtube.com:443/live2',
    rtmp_key TEXT,
    status TEXT DEFAULT 'stopped',
    loop_enabled INTEGER DEFAULT 1,
    scheduled_at DATETIME,
    expires_at DATETIME,
    started_at TEXT,
    FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT DEFAULT 'ankur0',
    password TEXT DEFAULT 'ANKURBAI'
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add loop_enabled column if it doesn't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(streams)").all() as any[];
  const hasLoopEnabled = tableInfo.some(col => col.name === 'loop_enabled');
  if (!hasLoopEnabled) {
    db.exec("ALTER TABLE streams ADD COLUMN loop_enabled INTEGER DEFAULT 1");
    console.log("Migration: Added loop_enabled column to streams table");
  }

  const videoTableInfo = db.prepare("PRAGMA table_info(videos)").all() as any[];
  const hasSize = videoTableInfo.some(col => col.name === 'size');
  if (!hasSize) {
    db.exec("ALTER TABLE videos ADD COLUMN size INTEGER DEFAULT 0");
    console.log("Migration: Added size column to videos table");
  }
  
  const hasDeletedAt = videoTableInfo.some(col => col.name === 'deleted_at');
  if (!hasDeletedAt) {
    db.exec("ALTER TABLE videos ADD COLUMN deleted_at DATETIME DEFAULT NULL");
    console.log("Migration: Added deleted_at column to videos table");
  }

  if (!videoTableInfo.some(col => col.name === 'duration')) {
    db.exec("ALTER TABLE videos ADD COLUMN duration REAL DEFAULT 0");
    console.log("Migration: Added duration column to videos table");
  }
  if (!videoTableInfo.some(col => col.name === 'resolution')) {
    db.exec("ALTER TABLE videos ADD COLUMN resolution TEXT");
    console.log("Migration: Added resolution column to videos table");
  }

  if (!videoTableInfo.some(col => col.name === 'is_remote')) {
    db.exec("ALTER TABLE videos ADD COLUMN is_remote INTEGER DEFAULT 0");
    console.log("Migration: Added is_remote column to videos table");
  }
  
  // Ensure default RTMP URL is set for existing rows
  db.prepare("UPDATE streams SET rtmp_url = 'rtmps://a.rtmp.youtube.com:443/live2' WHERE rtmp_url IS NULL OR rtmp_url = ''").run();

  // Migration: Add scheduled_at and expires_at columns
  const streamsTableInfo = db.prepare("PRAGMA table_info(streams)").all() as any[];
  if (!streamsTableInfo.some(col => col.name === 'scheduled_at')) {
    db.exec("ALTER TABLE streams ADD COLUMN scheduled_at DATETIME");
  }
  if (!streamsTableInfo.some(col => col.name === 'expires_at')) {
    db.exec("ALTER TABLE streams ADD COLUMN expires_at DATETIME");
  }
  if (!streamsTableInfo.some(col => col.name === 'started_at')) {
    db.exec("ALTER TABLE streams ADD COLUMN started_at TEXT DEFAULT NULL");
    console.log("Migration: Added started_at column to streams table");
  }
} catch (err) {
  console.error("Migration error:", err);
}

// Initialize 20 stream slots if they don't exist
for (let i = 1; i <= 20; i++) {
  const slot = db.prepare("SELECT * FROM streams WHERE slot_number = ?").get(i);
  if (!slot) {
    db.prepare("INSERT INTO streams (slot_number) VALUES (?)").run(i);
  }
}

// Initialize or update default auth credentials with the requested credentials
const adminUser = db.prepare("SELECT * FROM auth LIMIT 1").get() as any;
if (!adminUser) {
  db.prepare("INSERT INTO auth (username, password) VALUES (?, ?)").run("ankur0", "ANKURBAI");
  console.log("Startup: Created admin credentials with username ankur0");
} else {
  db.prepare("UPDATE auth SET username = ?, password = ? WHERE id = ?").run("ankur0", "ANKURBAI", adminUser.id);
  console.log("Startup: Updated existing admin credentials as requested to ankur0:ANKURBAI");
}

// Startup Cleanup: Reset all stream statuses to 'stopped'
db.prepare("UPDATE streams SET status = 'stopped'").run();
console.log("Startup: All stream statuses reset to stopped");

// Check for FFmpeg at startup
const ffmpegStartupCheck = spawn("ffmpeg", ["-version"]);
ffmpegStartupCheck.on("error", (err) => {
  console.error("CRITICAL: FFmpeg not found! Streaming will not work.");
  console.error("Please ensure FFmpeg is installed on the hosting platform.");
});
ffmpegStartupCheck.on("close", (code) => {
  if (code === 0) {
    console.log("Startup: FFmpeg detected successfully.");
  } else {
    console.warn(`Startup: FFmpeg check exited with code ${code}. It might not be working correctly.`);
  }
});

// Storage setup
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const tempChunksDir = path.join(DATA_DIR, "temp_chunks");
if (!fs.existsSync(tempChunksDir)) {
  fs.mkdirSync(tempChunksDir, { recursive: true });
}

// Multer setup for direct uploads (small files)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 * 50 } // 50GB limit for direct upload (supports high-quality 8K files)
});

// Multer for chunks
const chunkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { uploadId } = req.body;
    if (!uploadId) {
      return cb(new Error("uploadId is required"), "");
    }
    const chunkDir = path.join(tempChunksDir, uploadId);
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }
    cb(null, chunkDir);
  },
  filename: (req, file, cb) => {
    const { chunkIndex } = req.body;
    cb(null, `chunk-${chunkIndex || 0}`);
  },
});

const uploadChunk = multer({ storage: chunkStorage });

app.get("/api/video/:filename", (req, res) => {
  const { filename } = req.params;
  if (!filename) return res.status(400).json({ error: "Filename is required" });
  
  const filePath = path.join(uploadDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Video not found" });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const contentType = mime.lookup(filePath) || 'video/mp4';

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const part0 = parts[0];
    const part1 = parts[1];

    let start = 0;
    let end = fileSize - 1;

    if (part0 === "" && part1 !== "") {
      // Suffix range (e.g. -500)
      const suffix = parseInt(part1, 10);
      if (!isNaN(suffix)) {
        start = fileSize - suffix;
        if (start < 0) start = 0;
      }
    } else {
      start = parseInt(part0, 10);
      if (isNaN(start)) start = 0;

      if (part1 !== "") {
        end = parseInt(part1, 10);
        if (isNaN(end) || end >= fileSize) {
          end = fileSize - 1;
        }
      }
    }

    if (start >= fileSize) {
      res.status(416).set({
        'Content-Range': `bytes */${fileSize}`,
        'Accept-Ranges': 'bytes'
      }).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
      return;
    }

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Serving uploads directory
app.use("/uploads", express.static(uploadDir));

// Keep track of active FFmpeg processes and their logs
const activeProcesses = new Map<number, ChildProcess>();
const streamLogs = new Map<number, string[]>();

const addLog = (slot: number, message: string) => {
  const logs = streamLogs.get(slot) || [];
  logs.push(`[${new Date().toISOString()}] ${message}`);
  if (logs.length > 100) logs.shift(); // Keep last 100 lines
  streamLogs.set(slot, logs);
};

// API Routes
app.get("/api/health", async (req, res) => {
  try {
    const ffmpegCheck = spawn("ffmpeg", ["-version"]);
    let output = "";
    ffmpegCheck.stdout.on("data", (data) => output += data.toString());
    ffmpegCheck.on("error", (err) => {
      console.error("[Health] FFmpeg check error:", err);
      res.json({ status: "error", message: "ffmpeg not found" });
    });
    
    const protocolCheck = spawn("ffmpeg", ["-protocols"]);
    let protocols = "";
    protocolCheck.stdout.on("data", (data) => protocols += data.toString());
    protocolCheck.on("error", (err) => {
      console.error("[Health] FFmpeg protocol check error:", err);
    });

    // Get system memory usage
    const memUsage = process.memoryUsage();
    const systemMem = {
      rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
    };

    // Get CPU load
    const cpuLoad = os.loadavg();
    const cpuCount = os.cpus().length;

    ffmpegCheck.on("close", (code) => {
      res.json({ 
        status: "ok", 
        ffmpeg: code === 0 ? "installed" : "error",
        ffmpeg_version: output.split("\n")[0],
        rtmps_supported: protocols.includes("rtmps"),
        active_streams: activeProcesses.size,
        memory_usage: systemMem,
        cpu_load: cpuLoad,
        cpu_count: cpuCount,
        uptime: Math.round(process.uptime()) + "s"
      });
    });
  } catch (err) {
    console.error("[Health] Internal error:", err);
    res.status(500).json({ status: "error", message: "internal error" });
  }
});

app.get("/api/streams", (req, res) => {
  try {
    const streams = db.prepare(`
      SELECT s.*, v.original_name as video_name, v.filename as video_filename, v.is_remote
      FROM streams s 
      LEFT JOIN videos v ON s.video_id = v.id
      ORDER BY s.slot_number ASC
    `).all();
    res.json(streams);
  } catch (err) {
    console.error("[API] Error fetching streams:", err);
    res.status(500).json({ error: "Failed to fetch streams" });
  }
});

app.get("/api/videos", (req, res) => {
  try {
    const videos = db.prepare("SELECT * FROM videos WHERE deleted_at IS NULL ORDER BY created_at DESC").all();
    res.json(videos);
  } catch (err) {
    console.error("[API] Error fetching videos:", err);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

app.post("/api/videos/url", async (req, res) => {
  let { url, name } = req.body;
  if (!url || !name) return res.status(400).json({ error: "URL and name are required" });

  url = convertToRawUrl(url);

  try {
    // For remote URLs, we try to get metadata but don't block if it fails
    const { duration, resolution } = await getMetadata(url);
    
    const stmt = db.prepare("INSERT INTO videos (filename, original_name, path, size, duration, resolution, is_remote) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const info = stmt.run(url, name, url, 0, duration, resolution, 1);

    res.json({ id: info.lastInsertRowid, url });
  } catch (err) {
    console.error("URL add error:", err);
    res.status(500).json({ error: "Failed to add video via URL" });
  }
});

app.post("/api/upload", upload.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const { duration, resolution } = await getMetadata(req.file.path);

  const stmt = db.prepare("INSERT INTO videos (filename, original_name, path, size, duration, resolution) VALUES (?, ?, ?, ?, ?, ?)");
  const info = stmt.run(req.file.filename, req.file.originalname, req.file.path, req.file.size, duration, resolution);

  res.json({ id: info.lastInsertRowid, filename: req.file.filename });
});

app.post("/api/upload/chunk", uploadChunk.single("chunk"), (req, res) => {
  res.json({ success: true });
});

app.post("/api/upload/complete", async (req, res) => {
  const { uploadId, fileName, totalChunks } = req.body;
  if (!uploadId || !fileName) {
    return res.status(400).json({ error: "uploadId and fileName are required" });
  }
  
  const chunkDir = path.join(tempChunksDir, uploadId);
  const finalPath = path.join(uploadDir, `${Date.now()}-${fileName}`);

  try {
    const writeStream = fs.createWriteStream(finalPath);
    
    // Use an async function to process chunks sequentially without blocking the event loop
    const processChunks = async () => {
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(chunkDir, `chunk-${i}`);
        if (fs.existsSync(chunkPath)) {
          const chunkBuffer = await fs.promises.readFile(chunkPath);
          writeStream.write(chunkBuffer);
          await fs.promises.unlink(chunkPath);
        }
      }
      writeStream.end();
    };

    processChunks().catch(err => {
      console.error("Error processing chunks:", err);
      writeStream.destroy(err);
    });

    writeStream.on("finish", async () => {
      try {
        if (fs.existsSync(chunkDir)) {
          await fs.promises.rm(chunkDir, { recursive: true, force: true });
        }
        const stats = fs.statSync(finalPath);
        const { duration, resolution } = await getMetadata(finalPath);

        const stmt = db.prepare("INSERT INTO videos (filename, original_name, path, size, duration, resolution) VALUES (?, ?, ?, ?, ?, ?)");
        const info = stmt.run(path.basename(finalPath), fileName, finalPath, stats.size, duration, resolution);

        res.json({ id: info.lastInsertRowid, filename: path.basename(finalPath) });
      } catch (innerErr) {
        console.error("Error in writeStream finish handler:", innerErr);
        if (!res.headersSent) res.status(500).json({ error: "Failed to finalize upload" });
      }
    });

    writeStream.on("error", (err) => {
      console.error("WriteStream error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Failed to write combined file" });
    });
  } catch (err) {
    console.error("Chunk completion error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to complete upload" });
  }
});

app.post("/api/videos/:id/rename", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  db.prepare("UPDATE videos SET original_name = ? WHERE id = ?").run(name, id);
  res.json({ success: true });
});

app.post("/api/videos/:id/soft-delete", (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE videos SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  res.json({ success: true });
});

app.post("/api/videos/bulk-soft-delete", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "Invalid IDs" });
  
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`UPDATE videos SET deleted_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(...ids);
  res.json({ success: true });
});

app.get("/api/recycle-bin", (req, res) => {
  const videos = db.prepare("SELECT * FROM videos WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all();
  res.json(videos);
});

app.post("/api/recycle-bin/:id/restore", (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE videos SET deleted_at = NULL WHERE id = ?").run(id);
  res.json({ success: true });
});

app.post("/api/recycle-bin/bulk-restore", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "Invalid IDs" });
  
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`UPDATE videos SET deleted_at = NULL WHERE id IN (${placeholders})`).run(...ids);
  res.json({ success: true });
});

app.delete("/api/recycle-bin/:id/permanent", (req, res) => {
  const { id } = req.params;
  const video = db.prepare("SELECT * FROM videos WHERE id = ?").get(id) as any;
  if (video && video.path) {
    if (fs.existsSync(video.path)) fs.unlinkSync(video.path);
    db.prepare("DELETE FROM videos WHERE id = ?").run(id);
  } else if (video) {
    db.prepare("DELETE FROM videos WHERE id = ?").run(id);
  }
  res.json({ success: true });
});

app.post("/api/videos/bulk-permanent-delete", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "Invalid IDs" });
  
  for (const id of ids) {
    const video = db.prepare("SELECT * FROM videos WHERE id = ?").get(id) as any;
    if (video && video.path) {
      if (fs.existsSync(video.path)) fs.unlinkSync(video.path);
      db.prepare("DELETE FROM videos WHERE id = ?").run(id);
    } else if (video) {
      db.prepare("DELETE FROM videos WHERE id = ?").run(id);
    }
  }
  res.json({ success: true });
});

app.delete("/api/recycle-bin/empty", (req, res) => {
  const videos = db.prepare("SELECT * FROM videos WHERE deleted_at IS NOT NULL").all() as any[];
  for (const video of videos) {
    if (video.path && fs.existsSync(video.path)) {
      fs.unlinkSync(video.path);
    }
  }
  db.prepare("DELETE FROM videos WHERE deleted_at IS NOT NULL").run();
  res.json({ success: true });
});

app.get("/api/storage-stats", (req, res) => {
  try {
    const stats = db.prepare("SELECT SUM(size) as used FROM videos").get() as any;
    const used = stats.used || 0;
    res.json({
      used,
      limit: STORAGE_LIMIT_BYTES,
      percentage: (used / STORAGE_LIMIT_BYTES) * 100
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch storage stats" });
  }
});

app.get("/api/streams/:slot/logs", (req, res) => {
  const { slot } = req.params;
  res.json({ logs: streamLogs.get(parseInt(slot)) || [] });
});

const convertToRawUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === "github.com" && urlObj.pathname.includes("/blob/")) {
      return url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
    }
    return url;
  } catch (e) {
    return url;
  }
};

const getMetadata = (filePath: string): Promise<{ duration: number, resolution: string }> => {
  return new Promise((resolve) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration:stream=width,height",
      "-of", "json",
      filePath
    ]);

    const timeout = setTimeout(() => {
      ffprobe.kill();
      resolve({ duration: 0, resolution: "Unknown" });
    }, 30000); // 30 second timeout for large files

    let output = "";
    ffprobe.stdout.on("data", (data) => output += data.toString());
    ffprobe.on("close", () => {
      clearTimeout(timeout);
      try {
        const data = JSON.parse(output);
        const duration = parseFloat(data.format?.duration || "0");
        // Find the first video stream
        const videoStream = data.streams?.find((s: any) => s.width && s.height);
        const resolution = videoStream ? `${videoStream.width}x${videoStream.height}` : "Unknown";
        resolve({ duration, resolution });
      } catch (e) {
        resolve({ duration: 0, resolution: "Unknown" });
      }
    });
    ffprobe.on("error", () => {
      clearTimeout(timeout);
      resolve({ duration: 0, resolution: "Unknown" });
    });
  });
};

app.post("/api/streams/:slot/config", (req, res) => {
  const { slot } = req.params;
  const { video_id, rtmp_key, loop_enabled, scheduled_at, expires_at } = req.body;
  
  // Ensure video_id is null if not provided or 0
  const finalVideoId = (video_id === 0 || video_id === "" || video_id === undefined) ? null : video_id;
  
  try {
    db.prepare(`
      UPDATE streams 
      SET video_id = ?, rtmp_key = ?, loop_enabled = ?, scheduled_at = ?, expires_at = ?
      WHERE slot_number = ?
    `).run(finalVideoId, rtmp_key, loop_enabled ? 1 : 0, scheduled_at || null, expires_at || null, slot);
    res.json({ success: true });
  } catch (err) {
    console.error("Config update error:", err);
    res.status(500).json({ error: "Failed to update configuration. Ensure the selected video exists." });
  }
});

app.post("/api/streams/:slot/start", (req, res) => {
  const { slot } = req.params;
  const slotNum = parseInt(slot);
  
  if (activeProcesses.has(slotNum)) {
    return res.status(400).json({ error: "Stream already running" });
  }

  // Clear previous logs
  streamLogs.set(slotNum, []);
  
  startStreamInternal(slotNum);
  res.json({ success: true });
});

app.post("/api/streams/:slot/stop", (req, res) => {
  const { slot } = req.params;
  const slotNum = parseInt(slot);
  
  stopStreamInternal(slotNum);
  res.json({ success: true });
});

app.post("/api/videos/combine", async (req, res) => {
  const { baseVideoId, appendVideoIds, combinedName } = req.body;
  
  try {
    const baseVideo = db.prepare("SELECT * FROM videos WHERE id = ?").get(baseVideoId) as any;
    const appendVideos = db.prepare(`SELECT * FROM videos WHERE id IN (${appendVideoIds.map(() => "?").join(",")})`).all(...appendVideoIds) as any[];
    
    // Sort appendVideos to match the order in appendVideoIds
    const sortedAppendVideos = appendVideoIds.map(id => appendVideos.find(v => v.id === id)).filter(Boolean);

    if (!baseVideo) return res.status(404).json({ error: "Base video not found" });

    const finalName = combinedName || `Combined-${baseVideo.original_name}`;
    const finalFilename = `${Date.now()}-${finalName}.mp4`;
    const finalPath = path.join(uploadDir, finalFilename);

    // Create a temporary file listing all videos to combine
    const listFilePath = path.join(DATA_DIR, `list-${Date.now()}.txt`);
    const listContent = [baseVideo, ...sortedAppendVideos]
      .filter(v => v && v.path)
      .map(v => {
        const absolutePath = path.resolve(process.cwd(), v.path);
        const escapedPath = absolutePath.replace(/'/g, "'\\''");
        return `file '${escapedPath}'`;
      })
      .join("\n");
    fs.writeFileSync(listFilePath, listContent);

    const ffmpeg = spawn("ffmpeg", [
      "-f", "concat",
      "-safe", "0",
      "-i", listFilePath,
      "-c", "copy",
      finalPath
    ]);

    let ffmpegLogs = "";
    ffmpeg.stderr.on("data", (data) => {
      ffmpegLogs += data.toString();
    });
    ffmpeg.stdout.on("data", (data) => {
      ffmpegLogs += data.toString();
    });

    ffmpeg.on("close", async (code) => {
      fs.unlinkSync(listFilePath);
      if (code === 0) {
        const stats = fs.statSync(finalPath);
        const { duration, resolution } = await getMetadata(finalPath);
        
        const stmt = db.prepare("INSERT INTO videos (filename, original_name, path, size, duration, resolution) VALUES (?, ?, ?, ?, ?, ?)");
        const info = stmt.run(finalFilename, finalName, finalPath, stats.size, duration, resolution);
        
        res.json({ success: true, id: info.lastInsertRowid });
      } else {
        console.error("FFmpeg combination failed. Code:", code);
        console.error("FFmpeg output logs:\n", ffmpegLogs);
        res.status(500).json({ error: `FFmpeg failed to combine videos. Code: ${code}. Logs: ${ffmpegLogs.substring(0, 200)}` });
      }
    });
  } catch (err) {
    console.error("Combine error:", err);
    res.status(500).json({ error: "Internal server error during combination" });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const user = db.prepare("SELECT * FROM auth WHERE username = ? AND password = ?").get(username, password) as any;
    if (!user) {
      return res.status(401).json({ error: "Incorrect username or password" });
    }

    const token = randomBytes(24).toString("hex");
    db.prepare("INSERT INTO sessions (token) VALUES (?)").run(token);

    res.json({ success: true, token, username: user.username });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal login error" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    if (token) {
      db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    }
  }
  res.json({ success: true });
});

app.get("/api/auth/config", (req, res) => {
  try {
    const user = db.prepare("SELECT username FROM auth LIMIT 1").get() as any;
    res.json({ username: user ? user.username : "admin" });
  } catch (err) {
    res.status(500).json({ error: "Failed to get auth config" });
  }
});

app.post("/api/auth/config", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    db.prepare("UPDATE auth SET username = ?, password = ? WHERE id = (SELECT id FROM auth LIMIT 1)").run(username, password);
    res.json({ success: true });
  } catch (err) {
    console.error("Update credentials error:", err);
    res.status(500).json({ error: "Failed to update credentials" });
  }
});

// Catch-all for API routes to prevent falling through to Vite and returning HTML
app.all("/api/*", (req, res) => {
  console.warn(`[404] API route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Global Error Handler]", err);
  if (req.url.startsWith('/api/')) {
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack 
    });
  } else {
    next(err);
  }
});

// Start the server immediately
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Backend listening on http://0.0.0.0:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Initialize Vite or static serving asynchronously
async function initFrontend() {
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log("[Server] Initializing Vite middleware...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[Server] Vite middleware ready");
    } catch (err) {
      console.error("[Server] Failed to initialize Vite middleware:", err);
    }
  } else {
    const distPath = path.join(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
      console.log("[Server] Serving static files from dist/");
    } else {
      console.warn("[Server] Production mode but dist/ not found. API only mode active.");
    }
  }
}

initFrontend();
// Remove aggressive timeout settings that might cause connection resets
// server.timeout = 0;
// server.keepAliveTimeout = 0;

// Background task to handle scheduling and expiration
setInterval(() => {
  const now = new Date().toISOString();
  
  try {
    // 1. Handle Scheduled Starts
    const toStart = db.prepare(`
      SELECT * FROM streams 
      WHERE status = 'stopped' 
      AND scheduled_at IS NOT NULL 
      AND scheduled_at <= ?
      AND video_id IS NOT NULL
      AND rtmp_key IS NOT NULL
    `).all(now) as any[];

    for (const stream of toStart) {
      console.log(`[Scheduler] Starting scheduled stream for slot ${stream.slot_number}`);
      // Trigger start logic (internal helper or just use the existing logic)
      // For simplicity, we can refactor the start logic into a function
      startStreamInternal(stream.slot_number);
    }

    // 2. Handle Expirations
    const toStop = db.prepare(`
      SELECT * FROM streams 
      WHERE status = 'running' 
      AND expires_at IS NOT NULL 
      AND expires_at <= ?
    `).all(now) as any[];

    for (const stream of toStop) {
      console.log(`[Scheduler] Stopping expired stream for slot ${stream.slot_number}`);
      stopStreamInternal(stream.slot_number);
    }
  } catch (err) {
    console.error("Scheduler error:", err);
  }
}, 30000); // Check every 30 seconds

function startStreamInternal(slotNum: number) {
  try {
    const stream = db.prepare(`
      SELECT s.*, v.path as video_path, v.resolution as video_resolution, v.is_remote
      FROM streams s 
      JOIN videos v ON s.video_id = v.id 
      WHERE s.slot_number = ?
    `).get(slotNum) as any;

    if (!stream || !stream.video_path || !stream.rtmp_key) {
      addLog(slotNum, "Cannot start: Configuration incomplete or video missing.");
      return;
    }
    
    if (activeProcesses.has(slotNum)) return;

    if (!stream.is_remote && !fs.existsSync(stream.video_path)) {
      addLog(slotNum, `Error: Video file not found at ${stream.video_path}`);
      return;
    }

    let targetUrl = stream.rtmp_url || 'rtmps://a.rtmp.youtube.com:443/live2';
    
    // Auto-fix for YouTube: Force RTMPS if standard RTMP is used
    if (targetUrl.includes("youtube.com") && targetUrl.startsWith("rtmp://")) {
      targetUrl = targetUrl.replace("rtmp://", "rtmps://");
      if (!targetUrl.includes(":443")) {
        targetUrl = targetUrl.replace("youtube.com/", "youtube.com:443/");
      }
    }

    const fullRtmpUrl = targetUrl.endsWith('/') 
      ? `${targetUrl}${stream.rtmp_key}` 
      : `${targetUrl}/${stream.rtmp_key}`;
    
    addLog(slotNum, `Starting stream to ${targetUrl}/[HIDDEN_KEY]`);

    // Calculate bitrate and level based on resolution
    let bitrate = "12000k";
    let maxrate = "12000k";
    let bufsize = "12000k";
    let level = "4.1";

    if (stream.video_resolution && stream.video_resolution !== "Unknown") {
      const [width, height] = stream.video_resolution.split('x').map(Number);
      const pixels = width * height;
      addLog(slotNum, `Detected resolution: ${stream.video_resolution} (${pixels} pixels)`);

      // Flexible check to perfectly catch custom & cinematic 8K, 4K, 2K, etc.
      if (pixels >= 6000 * 3000 || width >= 6000 || height >= 3000) { // 8K Ultra HD
        bitrate = "60000k";
        maxrate = "60000k";
        bufsize = "120000k";
        level = "6.2"; // Level 6.2 is required for 8K streaming
      } else if (pixels >= 3500 * 2000 || width >= 3500 || height >= 2000) { // 4K Ultra HD
        bitrate = "30000k";
        maxrate = "30000k";
        bufsize = "60000k";
        level = "5.2"; // Level 5.2 handles high-quality 4K streaming
      } else if (pixels >= 2400 * 1400 || width >= 2400 || height >= 1400) { // 2K / 1440p
        bitrate = "16000k";
        maxrate = "16000k";
        bufsize = "32000k";
        level = "5.1";
      } else if (pixels >= 1800 * 1000 || width >= 1800 || height >= 1000) { // 1080p
        bitrate = "8000k";
        maxrate = "8000k";
        bufsize = "16000k";
        level = "4.2";
      } else if (pixels >= 1200 * 700 || width >= 1200 || height >= 700) { // 720p
        bitrate = "4000k";
        maxrate = "4000k";
        bufsize = "8000k";
        level = "4.0";
      } else { // 480p or lower
        bitrate = "2000k";
        maxrate = "2000k";
        bufsize = "4000k";
        level = "3.1";
      }
      addLog(slotNum, `Resolution detected: ${stream.video_resolution} (8K optimized check pass). Using bitrate: ${bitrate}, H.264 Level: ${level}`);
    } else {
      addLog(slotNum, `Resolution not detected. Using default bitrate: ${bitrate}`);
    }

    const ffmpegArgs = [
      "-re"
    ];

    // Add reconnect options for URL videos
    if (stream.video_path.startsWith('http')) {
      ffmpegArgs.push(
        "-reconnect", "1",
        "-reconnect_at_eof", "1",
        "-reconnect_streamed", "1",
        "-reconnect_delay_max", "2"
      );
    }

    if (stream.loop_enabled) {
      ffmpegArgs.push("-stream_loop", "-1");
    }

    ffmpegArgs.push(
      "-i", stream.video_path,
      "-c:v", "libx264",
      "-preset", "ultrafast", 
      "-tune", "zerolatency",
      "-profile:v", "high",
      "-level:v", level,
      "-b:v", bitrate,
      "-minrate", bitrate,
      "-maxrate", maxrate,
      "-bufsize", bufsize,
      "-x264-params", "nal-hrd=cbr:force-cfr=1:keyint=60:scenecut=0",
      "-pix_fmt", "yuv420p",
      "-r", "30",
      "-g", "60",
      "-vsync", "cfr",
      "-threads", "0"
    );

    // Explicitly set resolution if known to ensure platform recognizes it
    if (stream.video_resolution && stream.video_resolution !== "Unknown") {
      ffmpegArgs.push("-s", stream.video_resolution);
    } else {
      // Default to 1080p if unknown but bitrate is high
      ffmpegArgs.push("-s", "1920x1080");
    }

    ffmpegArgs.push(
      "-c:a", "aac",
      "-b:a", "128k",
      "-ar", "44100",
      "-max_muxing_queue_size", "1024",
      "-f", "flv",
      "-flvflags", "no_duration_filesize",
      fullRtmpUrl
    );

    addLog(slotNum, `Final streaming config - Bitrate: ${bitrate}, Preset: ultrafast`);

    const ffmpeg = spawn("ffmpeg", ffmpegArgs);
    activeProcesses.set(slotNum, ffmpeg);
    db.prepare("UPDATE streams SET status = 'running', started_at = ? WHERE slot_number = ?").run(new Date().toISOString(), slotNum);

    ffmpeg.stdout.on("data", (data) => {
      addLog(slotNum, `FFmpeg: ${data.toString().trim()}`);
    });

    ffmpeg.stderr.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg) addLog(slotNum, msg);
    });

    ffmpeg.on("error", (err) => {
      console.error(`FFmpeg spawn error for slot ${slotNum}:`, err);
      addLog(slotNum, `Process Error: ${err.message}`);
      activeProcesses.delete(slotNum);
      db.prepare("UPDATE streams SET status = 'stopped', started_at = NULL WHERE slot_number = ?").run(slotNum);
    });

    ffmpeg.on("close", (code) => {
      console.log(`FFmpeg process for slot ${slotNum} exited with code ${code}`);
      addLog(slotNum, `Process exited with code ${code}`);
      activeProcesses.delete(slotNum);
      db.prepare("UPDATE streams SET status = 'stopped', started_at = NULL WHERE slot_number = ?").run(slotNum);
    });
  } catch (err: any) {
    console.error(`Failed to start stream for slot ${slotNum}:`, err);
    addLog(slotNum, `Internal Error: ${err.message}`);
  }
}

function stopStreamInternal(slotNum: number) {
  const ffmpeg = activeProcesses.get(slotNum);
  if (ffmpeg) {
    ffmpeg.kill("SIGINT");
    activeProcesses.delete(slotNum);
  }
  db.prepare("UPDATE streams SET status = 'stopped', started_at = NULL WHERE slot_number = ?").run(slotNum);
}

// Cleanup on exit
process.on("SIGINT", () => {
  console.log("[Server] SIGINT received. Cleaning up...");
  for (const [slot, ffmpeg] of activeProcesses) {
    ffmpeg.kill("SIGINT");
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received. Cleaning up...");
  for (const [slot, ffmpeg] of activeProcesses) {
    ffmpeg.kill("SIGINT");
  }
  process.exit(0);
});
