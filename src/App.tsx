import React, { useState, useEffect, useRef } from "react";
import { 
  LayoutDashboard, 
  Upload, 
  Settings, 
  Play, 
  Square, 
  Video, 
  Activity, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  MoreVertical,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  HardDrive,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  Radio,
  Menu,
  RotateCcw,
  Trash,
  Check,
  AlertTriangle,
  Search,
  Cpu,
  Zap,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "react-hot-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { format } from "date-fns";
import { LoginScreen } from "./components/LoginScreen";

const translations = {
  en: {
    dashboard: "Dashboard",
    uploads: "Uploads",
    recycleBin: "Recycle Bin",
    settings: "Settings",
    systemOnline: "System Online",
    systemOffline: "System Offline",
    ffmpegNotFound: "FFmpeg Not Found",
    streamDashboard: "Stream Dashboard",
    manageStreams: "Manage your 24/7 live streams across 20 available slots.",
    noVideoConfigured: "No Video Configured for Slot",
    selectConfiguredSlot: "Select a configured slot below to preview its content.",
    slot: "SLOT",
    notConfigured: "Not Configured",
    running: "running",
    stopped: "stopped",
    start: "Start",
    stop: "Stop",
    storageUsed: "Storage Used",
    storageLimit: "Storage Limit",
    systemResources: "System Resources",
    activeStreams: "Active Streams",
    memoryUsage: "Memory Usage",
    uptime: "Uptime",
    stopAllStreams: "Stop All Streams",
    confirmStopAll: "Are you sure you want to stop all active streams immediately?",
    allStreamsStopped: "All streams have been stopped.",
    searchVideos: "Search videos...",
    uploadVideo: "Upload Video",
    addUrl: "Add URL",
    combineVideos: "Combine Videos",
    emptyRecycleBin: "Empty Recycle Bin",
    rename: "Rename",
    delete: "Delete",
    restore: "Restore",
    permanentDelete: "Permanent Delete",
    confirmDelete: "Are you sure you want to delete this video?",
    confirmPermanentDelete: "This action cannot be undone. Permanent delete?",
    confirmEmptyRecycleBin: "Are you sure you want to empty the Recycle Bin?",
    confirmBulkDelete: "Are you sure you want to delete all selected videos?",
    confirmBulkRestore: "Are you sure you want to restore all selected videos?",
    confirmBulkPermanentDelete: "Are you sure you want to permanently delete all selected videos?",
    uploading: "Uploading...",
    processing: "Processing...",
    success: "Success!",
    error: "Error",
    videoAdded: "Video added successfully",
    videoDeleted: "Video moved to recycle bin",
    videoRestored: "Video restored successfully",
    videoPermanentDeleted: "Video deleted permanently",
    recycleBinEmptied: "Recycle bin emptied",
    configSaved: "Configuration saved",
    streamStarted: "Stream started",
    streamStopped: "Stream stopped",
    renameSuccess: "Video renamed",
    combineSuccess: "Videos combined successfully",
    restoreSuccess: "Videos restored successfully",
    deleteSuccess: "Videos deleted successfully",
    videosSelected: "videos selected",
    highLoadWarning: "High System Load Detected! Streaming stability may be affected.",
    cpuLoad: "CPU Load",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    combineVideosTitle: "Combine Videos",
    appendVideosTo: "Append other videos to",
    combinedVideoName: "Combined Video Name",
    selectVideosToAppend: "Select Videos to Append (In Order)",
    cancel: "Cancel",
    confirm: "Confirm",
    combiningVideos: "Combining Videos...",
    combineN_Videos: (n: number) => `Combine ${n} Videos`,
    configureSlot: "Configure Slot",
    selectVideo: "Select Video",
    chooseVideo: "Choose a video...",
    youtubeStreamKey: "YouTube Stream Key",
    streamKeyPlaceholder: "Your secret stream key",
    rtmpsNote: "The system will automatically use RTMPS (Port 443) for YouTube.",
    infiniteLoop: "Infinite Loop",
    loopNote: "Automatically restart video when it ends",
    schedule: "Schedule",
    expire: "Expire",
    saveChanges: "Save Changes",
    renameVideo: "Rename Video",
    newName: "New Name",
    enterVideoName: "Enter video name...",
    moving: "Moving...",
    moveToBin: "Move to Bin",
    deleting: "Deleting...",
    deleteForever: "Delete Forever",
    addVideoViaUrl: "Add Video via URL",
    urlNote: "Enter a direct video link (e.g. GitHub raw link) to stream without uploading.",
    videoName: "Video Name",
    directVideoUrl: "Direct Video URL",
    addVideo: "Add Video",
    streamLogs: "Stream Logs",
    slotLogs: (n: number) => `Real-time logs for Slot ${n}`,
    close: "Close",
    noLogs: "No logs available for this slot.",
    logout: "Logout",
    securitySettings: "Security Settings",
    changeAdminCredentials: "Change Admin Credentials",
    newUsername: "New Username",
    newPassword: "New Password",
    saveCredentials: "Save Credentials",
    credentialsUpdated: "Credentials updated successfully",
    confirmUpdateCredentials: "Are you sure you want to change the administrator username and password?",
  }
};

interface VideoData {
  id: number;
  filename: string;
  original_name: string;
  path: string;
  size: number;
  duration: number;
  resolution: string;
  created_at: string;
  is_remote?: number;
}

interface StreamData {
  id: number;
  slot_number: number;
  video_id: number | null;
  video_name: string | null;
  video_filename: string | null;
  is_remote: number | null;
  rtmp_url: string | null;
  rtmp_key: string | null;
  status: 'running' | 'stopped';
  loop_enabled: number;
  scheduled_at: string | null;
  expires_at: string | null;
  started_at: string | null;
}

const ResourceMonitor = ({ status, t }: { status: any, t: any }) => {
  if (!status) return null;

  const cpuLoad = status.cpu_load?.[0] || 0;
  const cpuPercentage = Math.min(Math.round((cpuLoad / (status.cpu_count || 1)) * 100), 100);
  
  // Parse memory string (e.g., "150MB")
  const rss = parseInt(status.memory_usage?.rss || "0");
  const memPercentage = Math.min(Math.round((rss / 2048) * 100), 100); // Assuming 2GB limit for visualization

  const isHighLoad = cpuPercentage > 80 || memPercentage > 90;

  return (
    <div className="space-y-4 mb-8">
      {isHighLoad && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400"
        >
          <AlertTriangle size={20} className="shrink-0" />
          <p className="text-sm font-bold">{t.highLoadWarning}</p>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{t.activeStreams}</p>
            <p className="text-lg font-bold">{status.active_streams || 0} / 20</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
            <Cpu size={20} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-end mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{t.cpuLoad}</p>
              <p className="text-xs font-bold text-indigo-400">{cpuPercentage}%</p>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${cpuPercentage}%` }}
                className={`h-full rounded-full ${cpuPercentage > 80 ? 'bg-red-500' : cpuPercentage > 50 ? 'bg-amber-500' : 'bg-indigo-500'}`}
              />
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
            <Zap size={20} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-end mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{t.memoryUsage}</p>
              <p className="text-xs font-bold text-amber-400">{status.memory_usage?.rss}</p>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${memPercentage}%` }}
                className={`h-full rounded-full ${memPercentage > 80 ? 'bg-red-500' : memPercentage > 50 ? 'bg-amber-500' : 'bg-amber-500'}`}
              />
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{t.uptime}</p>
            <p className="text-lg font-bold">{status.uptime}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const lang = 'en';
  const t = translations.en;
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem("stream_auth_token");
  });
  const [adminUsername, setAdminUsername] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [isUpdatingAuth, setIsUpdatingAuth] = useState(false);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("stream_auth_token");
    const headers = {
      ...options.headers,
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
    
    // For file upload, don't set Content-Type because multer needs boundary
    const isMultipart = options.body instanceof FormData;
    if (isMultipart) {
      delete (headers as any)["Content-Type"];
    }

    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401 && !url.includes("/api/auth/login")) {
      localStorage.removeItem("stream_auth_token");
      setIsAuthenticated(false);
      throw new Error("Session expired. Please log in again.");
    }
    
    return res;
  };

  const handleLogout = async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("stream_auth_token");
      setIsAuthenticated(false);
    }
  };

  const fetchAuthConfig = async () => {
    try {
      const res = await authFetch("/api/auth/config");
      if (res.ok) {
        const data = await res.json();
        setAdminUsername(data.username);
        setNewAdminUsername(data.username);
      }
    } catch (err) {
      console.error("Failed to fetch auth credentials in settings", err);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'dashboard' | 'uploads' | 'recycle' | 'settings'>('dashboard');
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [deletedVideos, setDeletedVideos] = useState<VideoData[]>([]);
  const [streams, setStreams] = useState<StreamData[]>([]);
  const [configSlot, setConfigSlot] = useState<number | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [currentLogs, setCurrentLogs] = useState<string[]>([]);
  const [logSlot, setLogSlot] = useState<number | null>(null);
  const [systemStatus, setSystemStatus] = useState<{
    status: string, 
    ffmpeg: string, 
    ffmpeg_version?: string, 
    rtmps_supported?: boolean,
    active_streams?: number,
    memory_usage?: { rss: string, heapTotal: string, heapUsed: string },
    cpu_load?: number[],
    cpu_count?: number,
    uptime?: string
  } | null>(null);
  const [storageStats, setStorageStats] = useState<{used: number, limit: number, percentage: number} | null>(null);
  const [editingVideo, setEditingVideo] = useState<{id: number, name: string} | null>(null);
  const [selectedPreviewSlot, setSelectedPreviewSlot] = useState<number | null>(1);
  const [isEmptyingRecycleBin, setIsEmptyingRecycleBin] = useState(false);
  const [isLiveStreamMenuOpen, setIsLiveStreamMenuOpen] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<number[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: 'info',
    confirmText: ""
  });
  const [videoUrl, setVideoUrl] = useState("");
  const [videoUrlName, setVideoUrlName] = useState("");
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Combine states
  const [isCombineModalOpen, setIsCombineModalOpen] = useState(false);
  const [baseVideoForCombine, setBaseVideoForCombine] = useState<VideoData | null>(null);
  const [selectedVideosToAppend, setSelectedVideosToAppend] = useState<number[]>([]);
  const [isCombining, setIsCombining] = useState(false);
  const [combinedVideoName, setCombinedVideoName] = useState("");

  // Video Player state
  const [playingVideo, setPlayingVideo] = useState<VideoData | null>(null);

  useEffect(() => {
    setSelectedVideoIds([]);
  }, [activeTab]);

  // Form states for configuration
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [rtmpKey, setRtmpKey] = useState("");
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(false);
  const [isExpireEnabled, setIsExpireEnabled] = useState(false);
  const [showStreamKey, setShowStreamKey] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      checkSystem();
      const interval = setInterval(fetchStreams, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const checkSystem = async () => {
    try {
      const res = await authFetch("/api/health");
      if (!res.ok) {
        const text = await res.text();
        console.error(`System check failed with status ${res.status}: ${text.substring(0, 100)}`);
        return;
      }
      const data = await res.json();
      setSystemStatus(data);
    } catch (err) {
      console.error("System check failed", err);
    }
  };

  useEffect(() => {
    let logInterval: any;
    if (isLogModalOpen && logSlot !== null) {
      const fetchLogs = async () => {
        try {
          const res = await authFetch(`/api/streams/${logSlot}/logs`);
          const data = await res.json();
          setCurrentLogs(data.logs);
        } catch (err) {
          console.error("Failed to fetch logs", err);
        }
      };
      fetchLogs();
      logInterval = setInterval(fetchLogs, 2000);
    }
    return () => clearInterval(logInterval);
  }, [isLogModalOpen, logSlot]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchData = async () => {
    await Promise.all([fetchVideos(), fetchStreams(), fetchDeletedVideos(), fetchStorageStats(), fetchAuthConfig()]);
  };

  const fetchDeletedVideos = async () => {
    try {
      const res = await authFetch("/api/recycle-bin");
      const data = await res.json();
      setDeletedVideos(data);
    } catch (err) {
      console.error("Failed to fetch deleted videos", err);
    }
  };

  const fetchStorageStats = async () => {
    try {
      const res = await authFetch("/api/storage-stats");
      const data = await res.json();
      setStorageStats(data);
    } catch (err) {
      console.error("Failed to fetch storage stats", err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchVideos = async () => {
    try {
      const res = await authFetch("/api/videos");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text.substring(0, 50)}`);
      }
      const data = await res.json();
      setVideos(data);
      setApiError(null);
    } catch (err: any) {
      console.error("Failed to fetch videos", err);
      setApiError(err.message || "Backend সার্ভারটি চালু নেই। অনুগ্রহ করে নিশ্চিত করুন যে আপনার সার্ভারটি সঠিকভাবে চলছে।");
    }
  };

  const fetchStreams = async () => {
    try {
      const res = await authFetch("/api/streams");
      if (!res.ok) {
        const text = await res.text();
        console.error(`Failed to fetch streams (${res.status}): ${text.substring(0, 50)}`);
        return;
      }
      const data = await res.json();
      setStreams(data);
    } catch (err) {
      console.error("Failed to fetch streams", err);
    }
  };

  const handleAddUrl = async () => {
    if (!videoUrl || !videoUrlName) return;
    setIsAddingUrl(true);
    try {
      const res = await authFetch("/api/videos/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl, name: videoUrlName }),
      });
      if (res.ok) {
        setVideoUrl("");
        setVideoUrlName("");
        setIsUrlModalOpen(false);
        fetchVideos();
        toast.success(t.videoAdded);
      } else {
        const data = await res.json();
        setUploadError(data.error || "Failed to add video URL");
        toast.error(data.error || t.error);
      }
    } catch (err) {
      setUploadError("Network error while adding video URL");
    } finally {
      setIsAddingUrl(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = Date.now().toString();

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("chunkIndex", i.toString());
        formData.append("totalChunks", totalChunks.toString());
        formData.append("uploadId", uploadId);
        formData.append("fileName", file.name);
        formData.append("chunk", chunk);

        const res = await authFetch("/api/upload/chunk", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Chunk upload failed");
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 90));
      }

      setIsProcessing(true);
      const completeRes = await authFetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          fileName: file.name,
          totalChunks,
        }),
      });

      if (!completeRes.ok) throw new Error("Upload completion failed");
      
      setUploadProgress(100);
      await fetchData();
      setIsUploading(false);
      setIsProcessing(false);
      toast.success(t.success);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Upload failed");
      setIsUploading(false);
      setIsProcessing(false);
      toast.error(err.message || t.error);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openConfigModal = (stream: StreamData) => {
    setConfigSlot(stream.slot_number);
    setSelectedVideo(stream.video_id);
    setRtmpKey(stream.rtmp_key || "");
    setLoopEnabled(stream.loop_enabled === 1);
    setScheduledAt(stream.scheduled_at ? stream.scheduled_at.slice(0, 16) : "");
    setExpiresAt(stream.expires_at ? stream.expires_at.slice(0, 16) : "");
    setIsScheduleEnabled(!!stream.scheduled_at);
    setIsExpireEnabled(!!stream.expires_at);
    setIsConfigModalOpen(true);
  };

  const openLogModal = (stream: StreamData) => {
    setLogSlot(stream.slot_number);
    setIsLogModalOpen(true);
  };

  const saveConfig = async () => {
    if (configSlot === null) return;
    try {
      const res = await authFetch(`/api/streams/${configSlot}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: selectedVideo,
          rtmp_key: rtmpKey,
          loop_enabled: loopEnabled,
          scheduled_at: isScheduleEnabled ? (scheduledAt || null) : null,
          expires_at: isExpireEnabled ? (expiresAt || null) : null,
        }),
      });
      const contentType = res.headers.get("content-type");
      if (res.ok) {
        await fetchStreams();
        setIsConfigModalOpen(false);
        toast.success(t.configSaved);
      } else if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        toast.error(data.error || "Failed to save configuration");
      } else {
        const text = await res.text();
        console.error("Save config failed (non-JSON):", res.status, text.substring(0, 100));
        toast.error(`Failed to save configuration: Server returned ${res.status}`);
      }
    } catch (err) {
      console.error("Failed to save config", err);
      toast.error("Network error while saving configuration");
    }
  };

  const toggleStream = async (slot: number, currentStatus: string) => {
    const action = currentStatus === 'running' ? 'stop' : 'start';
    try {
      const res = await authFetch(`/api/streams/${slot}/${action}`, { method: "POST" });
      const contentType = res.headers.get("content-type");
      if (res.ok) {
        await fetchStreams();
        toast.success(action === 'start' ? t.streamStarted : t.streamStopped);
      } else if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        toast.error(data.error || `Failed to ${action} stream`);
      } else {
        const text = await res.text();
        console.error(`${action} stream failed (non-JSON):`, res.status, text.substring(0, 100));
        toast.error(`Failed to ${action} stream: Server returned ${res.status}`);
      }
    } catch (err) {
      console.error(`Failed to ${action} stream`, err);
      toast.error(`Network error while trying to ${action} stream`);
    }
  };

  const renameVideo = async (id: number, newName: string) => {
    try {
      const res = await authFetch(`/api/videos/${id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setEditingVideo(null);
        fetchVideos();
        toast.success(t.renameSuccess);
      }
    } catch (err) {
      console.error("Failed to rename video", err);
    }
  };

  const deleteVideo = async (id: number) => {
    try {
      const res = await authFetch(`/api/videos/${id}/soft-delete`, { method: "POST" });
      if (res.ok) {
        fetchData();
        toast.success(t.videoDeleted);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    } catch (err) {
      console.error("Failed to delete video", err);
      toast.error(t.error);
    }
  };

  const restoreVideo = async (id: number) => {
    try {
      const res = await authFetch(`/api/recycle-bin/${id}/restore`, { method: "POST" });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to restore video", err);
    }
  };

  const permanentDelete = async (id: number) => {
    try {
      const res = await authFetch(`/api/recycle-bin/${id}/permanent`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        toast.success(t.videoPermanentDeleted);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    } catch (err) {
      console.error("Failed to permanently delete video", err);
      toast.error(t.error);
    }
  };

  const stopAllStreams = async () => {
    try {
      const runningStreams = streams.filter(s => s.status === 'running');
      if (runningStreams.length === 0) {
        toast.error("No active streams to stop.");
        return;
      }

      const promises = runningStreams.map(s => 
        authFetch(`/api/streams/${s.slot_number}/stop`, { method: "POST" })
      );
      
      await Promise.all(promises);
      fetchData();
      toast.success(t.allStreamsStopped);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error("Failed to stop all streams", err);
      toast.error(t.error);
    }
  };
  const emptyRecycleBin = async () => {
    setIsEmptyingRecycleBin(true);
    try {
      const res = await authFetch("/api/recycle-bin/empty", { method: "DELETE" });
      if (res.ok) {
        fetchData();
        toast.success(t.recycleBinEmptied);
      }
    } catch (err) {
      console.error("Failed to empty recycle bin", err);
      toast.error(t.error);
    } finally {
      setIsEmptyingRecycleBin(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleCombine = async () => {
    if (!baseVideoForCombine || selectedVideosToAppend.length === 0) return;
    
    setIsCombining(true);
    try {
      const res = await authFetch("/api/videos/combine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseVideoId: baseVideoForCombine.id,
          appendVideoIds: selectedVideosToAppend,
          combinedName: combinedVideoName
        }),
      });
      
      if (res.ok) {
        setIsCombineModalOpen(false);
        setBaseVideoForCombine(null);
        setSelectedVideosToAppend([]);
        setCombinedVideoName("");
        fetchData();
        toast.success(t.combineSuccess);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to combine videos");
      }
    } catch (err) {
      console.error("Failed to combine videos", err);
      toast.error("Network error while combining videos");
    } finally {
      setIsCombining(false);
    }
  };

  const confirmBulkSoftDelete = async () => {
    setIsBulkProcessing(true);
    try {
      const res = await authFetch("/api/videos/bulk-soft-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedVideoIds }),
      });
      if (res.ok) {
        setSelectedVideoIds([]);
        fetchData();
        toast.success(t.deleteSuccess);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    } catch (err) {
      console.error("Bulk delete failed", err);
      toast.error(t.error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const bulkRestore = async () => {
    setIsBulkProcessing(true);
    try {
      const res = await authFetch("/api/recycle-bin/bulk-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedVideoIds }),
      });
      if (res.ok) {
        setSelectedVideoIds([]);
        fetchData();
        toast.success(t.restoreSuccess);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    } catch (err) {
      console.error("Bulk restore failed", err);
      toast.error(t.error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const bulkPermanentDelete = async () => {
    setIsBulkProcessing(true);
    try {
      const res = await authFetch("/api/videos/bulk-permanent-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedVideoIds }),
      });
      if (res.ok) {
        setSelectedVideoIds([]);
        fetchData();
        toast.success(t.videoPermanentDeleted);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    } catch (err) {
      console.error("Bulk permanent delete failed", err);
      toast.error(t.error);
    } finally {
      setIsBulkProcessing(false);
    }
  };



  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#111111',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '16px',
          },
        }} />
        <LoginScreen 
          onLoginSuccess={(token, username) => {
            localStorage.setItem("stream_auth_token", token);
            setIsAuthenticated(true);
            toast.success("Successfully logged in!");
          }}
          t={t}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white font-sans overflow-hidden relative">
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#111111',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '16px',
        },
      }} />
      {/* Floating Overlay Menu */}
      <AnimatePresence>
        {isLiveStreamMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLiveStreamMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#111111] border-r border-white/5 z-50 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 text-emerald-500">
                  <Radio size={24} />
                  <span className="text-xl font-bold tracking-tighter uppercase">Studio</span>
                </div>
                <button 
                  onClick={() => setIsLiveStreamMenuOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                <button 
                  onClick={() => { setActiveTab('dashboard'); setIsLiveStreamMenuOpen(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                  <LayoutDashboard size={20} />
                  <span className="font-semibold">{t.dashboard}</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('uploads'); setIsLiveStreamMenuOpen(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${activeTab === 'uploads' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                  <Upload size={20} />
                  <span className="font-semibold">{t.uploads}</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('recycle'); setIsLiveStreamMenuOpen(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${activeTab === 'recycle' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                  <Trash size={20} />
                  <span className="font-semibold">{t.recycleBin}</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('settings'); setIsLiveStreamMenuOpen(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                  <Settings size={20} />
                  <span className="font-semibold">{t.settings}</span>
                </button>
                <button 
                  onClick={() => { handleLogout(); setIsLiveStreamMenuOpen(false); }}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <LogOut size={20} />
                  <span className="font-semibold">{t.logout}</span>
                </button>
              </nav>

              <div className="mt-auto pt-6 border-t border-white/5">
                <div className="bg-white/5 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">{t.activeStreams}</span>
                    <span className="text-xs text-emerald-400 font-mono">{streams.filter(s => s.status === 'running').length}/20</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(streams.filter(s => s.status === 'running').length / 20) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {apiError && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 text-red-400 mb-8">
            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center shrink-0">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-bold text-lg">Backend কানেকশন এরর</h3>
              <p className="text-sm opacity-80">{apiError}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                <button 
                  onClick={() => { setApiError(null); fetchData(); checkSystem(); }}
                  className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-600 transition-colors"
                >
                  আবার চেষ্টা করুন
                </button>
              </div>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsLiveStreamMenuOpen(!isLiveStreamMenuOpen)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white"
                  >
                    <Menu size={24} />
                  </button>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <h2 className="text-3xl font-semibold tracking-tight">{t.streamDashboard}</h2>
                    <span className="self-start md:self-auto px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1 shadow-lg shadow-emerald-500/5 select-none">
                      <Zap size={10} className="fill-emerald-400" />
                      8K ULTRA HD SUPPORTED
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {systemStatus?.ffmpeg === "error" && (
                    <div className="px-4 py-2 bg-red-500/10 rounded-xl border border-red-500/20 flex items-center gap-2 text-red-400">
                      <AlertCircle size={16} />
                      <span className="text-sm font-medium">{t.ffmpegNotFound}</span>
                    </div>
                  )}
                </div>
              </header>

              <div className="grid grid-cols-1 gap-8">
                {/* Preview Display */}
                <div className="bg-[#111111] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
                  <div className="aspect-video bg-black relative group">
                    {selectedPreviewSlot && streams.find(s => s.slot_number === selectedPreviewSlot)?.video_filename ? (
                      <video 
                        key={streams.find(s => s.slot_number === selectedPreviewSlot)?.video_filename}
                        src={streams.find(s => s.slot_number === selectedPreviewSlot)?.is_remote ? streams.find(s => s.slot_number === selectedPreviewSlot)?.video_filename! : `/uploads/${encodeURIComponent(streams.find(s => s.slot_number === selectedPreviewSlot)?.video_filename || "")}`}
                        controls
                        autoPlay
                        muted
                        preload="auto"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                        <Video size={64} className="mb-4 opacity-10" />
                        <p className="text-lg font-medium">{t.noVideoConfigured} {selectedPreviewSlot}</p>
                        <p className="text-sm">{t.selectConfiguredSlot}</p>
                      </div>
                    )}
                    
                    {/* Overlay Info */}
                    <div className="absolute top-6 left-6 flex items-center gap-3">
                      <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${streams.find(s => s.slot_number === selectedPreviewSlot)?.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                        <span className="text-xs font-bold uppercase tracking-widest">{t.slot} {selectedPreviewSlot?.toString().padStart(2, '0')}</span>
                      </div>
                      {streams.find(s => s.slot_number === selectedPreviewSlot)?.video_name && (
                        <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                          <span className="text-xs font-medium text-white/80">{streams.find(s => s.slot_number === selectedPreviewSlot)?.video_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {streams.map((stream) => (
                  <div 
                    key={stream.slot_number}
                    onClick={() => setSelectedPreviewSlot(stream.slot_number)}
                    className={`bg-[#111111] border rounded-2xl p-5 flex flex-col gap-4 transition-all group relative overflow-hidden cursor-pointer ${
                      selectedPreviewSlot === stream.slot_number 
                        ? 'border-emerald-500/50 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5' 
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-white/30">{t.slot} {stream.slot_number.toString().padStart(2, '0')}</span>
                      <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${stream.status === 'running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                        {stream.status === 'running' ? t.running : t.stopped}
                      </div>
                    </div>

                    {/* Stream Info */}
                    <div className="flex-1 min-h-[80px]">
                      {stream.video_id ? (
                        <div className="space-y-1">
                          <p className="text-sm font-medium truncate">{stream.video_name}</p>
                          <p className="text-xs text-white/40 truncate">{stream.rtmp_url ? 'RTMP Configured' : 'No RTMP URL'}</p>
                          {stream.scheduled_at && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400/60">
                              <Calendar size={10} />
                              <span className="truncate">Starts: {format(new Date(stream.scheduled_at), 'PPp')}</span>
                            </div>
                          )}
                          {stream.expires_at && (
                            <div className="flex items-center gap-1 text-[10px] text-red-400/60">
                              <Clock size={10} />
                              <span className="truncate">Ends: {format(new Date(stream.expires_at), 'PPp')}</span>
                            </div>
                          )}
                          {stream.status === 'running' && stream.started_at && (
                            <div className="mt-2.5 p-2 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-center flex flex-col items-center justify-center gap-0.5 shadow-md shadow-emerald-950/20 select-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                STREAM STARTED
                              </span>
                              <span className="text-[10px] font-mono text-emerald-300/90 font-medium">
                                {format(new Date(stream.started_at), 'PPpp')}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                          <Video size={24} className="mb-2" />
                          <p className="text-xs">{t.notConfigured}</p>
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStream(stream.slot_number, stream.status);
                        }}
                        disabled={!stream.video_id || !stream.rtmp_url}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
                          stream.status === 'running' 
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                            : 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-20 disabled:cursor-not-allowed'
                        }`}
                      >
                        {stream.status === 'running' ? <Square size={16} /> : <Play size={16} />}
                        {stream.status === 'running' ? t.stop : t.start}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openConfigModal(stream);
                        }}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white"
                      >
                        <Settings size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openLogModal(stream);
                        }}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white"
                        title="View Logs"
                      >
                        <Activity size={18} />
                      </button>
                    </div>

                    {/* Background Glow */}
                    {stream.status === 'running' && (
                      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'uploads' && (
            <motion.div 
              key="uploads"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsLiveStreamMenuOpen(!isLiveStreamMenuOpen)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white"
                  >
                    <Menu size={24} />
                  </button>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-semibold tracking-tight">{t.uploads}</h2>
                      {videos.length > 0 && (
                        <button 
                          onClick={() => {
                            if (selectedVideoIds.length === videos.length) {
                              setSelectedVideoIds([]);
                            } else {
                              setSelectedVideoIds(videos.map(v => v.id));
                            }
                          }}
                          className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all border border-emerald-500/20"
                        >
                          {selectedVideoIds.length === videos.length ? t.deselectAll : t.selectAll}
                        </button>
                      )}
                    </div>
                    <p className="text-white/40 text-sm">Manage your video library and upload new content.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <input 
                      type="text"
                      placeholder={t.searchVideos}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/5 border border-white/5 rounded-2xl px-5 py-3 pl-12 w-64 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                    />
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                  <button 
                    onClick={() => setIsUrlModalOpen(true)}
                    className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all border border-white/10"
                  >
                    <ExternalLink size={20} />
                    {t.addUrl}
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                    {isUploading ? t.uploading : t.uploadVideo}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleUpload} 
                    accept="video/*" 
                    className="hidden" 
                  />
                </div>
              </header>

              {/* Storage & Library Stats Widget */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-emerald-500/20 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                      <HardDrive size={22} className="stroke-[1.5]" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                        Total Uploaded
                      </p>
                      <h3 className="text-2xl font-bold mt-0.5 text-white">
                        {storageStats ? formatBytes(storageStats.used) : '0 Bytes'}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      {storageStats ? `${((storageStats.used / (storageStats.limit || 1)) * 100).toFixed(2)}%` : '0%'}
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-emerald-500/20 transition-all duration-300">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                    <Video size={22} className="stroke-[1.5]" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                      Total Videos
                    </p>
                    <h3 className="text-2xl font-bold mt-0.5 text-white">
                      {videos.length}
                    </h3>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 rounded-2xl p-5 flex flex-col justify-center gap-3 hover:border-emerald-500/20 transition-all duration-300">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/40">
                    <span>Storage Limit Progress</span>
                    <span className="text-white/60">
                      {storageStats ? formatBytes(storageStats.used) : '0 Bytes'} / {storageStats ? formatBytes(storageStats.limit || 536870912000) : '500 GB'}
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500 animate-pulse"
                      style={{ width: `${Math.min(100, storageStats ? (storageStats.used / (storageStats.limit || 1)) * 100 : 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {isUploading && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                        <Loader2 className="animate-spin" size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-emerald-400">{isProcessing ? 'Processing Video...' : 'Uploading Video...'}</p>
                        <p className="text-xs text-emerald-400/60">{isProcessing ? 'Finalizing and extracting metadata' : `${uploadProgress}% complete`}</p>
                      </div>
                    </div>
                    <button 
                      onClick={cancelUpload}
                      className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                  <AlertCircle size={18} />
                  <p>{uploadError}</p>
                  <button onClick={() => setUploadError(null)} className="ml-auto text-white/40 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
              )}

              {selectedVideoIds.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-emerald-400">{selectedVideoIds.length} {t.videosSelected}</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedVideoIds([])}
                        className="text-xs text-white/40 hover:text-white underline"
                      >
                        {t.deselectAll}
                      </button>
                      {selectedVideoIds.length < videos.length && (
                        <button 
                          onClick={() => setSelectedVideoIds(videos.map(v => v.id))}
                          className="text-xs text-white/40 hover:text-white underline"
                        >
                          {t.selectAll}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedVideoIds.length >= 2 && (
                      <button 
                        onClick={() => {
                          const baseVideo = videos.find(v => v.id === selectedVideoIds[0]);
                          if (baseVideo) {
                            setBaseVideoForCombine(baseVideo);
                            setSelectedVideosToAppend(selectedVideoIds.slice(1));
                            setCombinedVideoName(`Combined - ${baseVideo.original_name}`);
                            setIsCombineModalOpen(true);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold transition-all"
                      >
                        <Plus size={14} />
                        {t.combineVideos}
                      </button>
                    )}
                    <button 
                      onClick={() => setConfirmModal({
                        isOpen: true,
                        title: t.delete,
                        message: t.confirmBulkDelete,
                        onConfirm: confirmBulkSoftDelete,
                        type: 'danger'
                      })}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all"
                    >
                      <Trash2 size={14} />
                      {t.delete}
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos
                  .filter(v => v.original_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((video) => (
                  <motion.div 
                    layout
                    key={video.id}
                    className={`group bg-[#111111] border rounded-[32px] overflow-hidden transition-all hover:shadow-2xl hover:shadow-emerald-500/5 ${selectedVideoIds.includes(video.id) ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-white/5 hover:border-white/10'}`}
                  >
                    <div className="aspect-video bg-black relative overflow-hidden">
                      <video 
                        src={video.is_remote ? video.filename : `/uploads/${encodeURIComponent(video.filename)}`}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {/* Selection Overlay */}
                      <button 
                        onClick={() => {
                          if (selectedVideoIds.includes(video.id)) {
                            setSelectedVideoIds(prev => prev.filter(id => id !== video.id));
                          } else {
                            setSelectedVideoIds(prev => [...prev, video.id]);
                          }
                        }}
                        className={`absolute top-4 left-4 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${selectedVideoIds.includes(video.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-black/40 border-white/20 text-transparent group-hover:text-white/20'}`}
                      >
                        <Check size={14} />
                      </button>

                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold text-white/80">
                            {formatDuration(video.duration)}
                          </div>
                          <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold text-white/80 uppercase">
                            {video.resolution}
                          </div>
                        </div>
                        <button 
                          onClick={() => setPlayingVideo(video)}
                          className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center translate-y-12 group-hover:translate-y-0 transition-all duration-300 shadow-xl"
                        >
                          <Play size={20} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-lg truncate group-hover:text-emerald-400 transition-colors">{video.original_name}</h4>
                            {video.is_remote === 1 && (
                              <div className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-bold uppercase tracking-widest rounded border border-emerald-500/20">
                                URL
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-white/30 mt-1">{video.is_remote ? 'Remote Link' : formatBytes(video.size)} • {video.is_remote ? 'Added' : 'Uploaded'} {new Date(video.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setEditingVideo({ id: video.id, name: video.original_name })}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/20 hover:text-white"
                            title="Rename"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setBaseVideoForCombine(video);
                              setCombinedVideoName(`Combined - ${video.original_name}`);
                              setIsCombineModalOpen(true);
                            }}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/20 hover:text-emerald-400"
                            title="Combine with others"
                          >
                            <Plus size={16} />
                          </button>
                          <button 
                            onClick={() => setConfirmModal({
                              isOpen: true,
                              title: t.delete,
                              message: t.confirmDelete,
                              onConfirm: () => deleteVideo(video.id),
                              type: 'danger'
                            })}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/20 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {videos.length === 0 && !isUploading && (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                      <Video size={40} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">No Videos Found</h3>
                      <p className="text-white/40 max-w-xs mx-auto mt-2">Upload your first video to start building your 24/7 stream library.</p>
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white text-black px-6 py-3 rounded-2xl font-bold hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      Upload Now
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'recycle' && (
            <motion.div 
              key="recycle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsLiveStreamMenuOpen(!isLiveStreamMenuOpen)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white"
                  >
                    <Menu size={24} />
                  </button>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-semibold tracking-tight">{t.recycleBin}</h2>
                      {deletedVideos.length > 0 && (
                        <button 
                          onClick={() => {
                            if (selectedVideoIds.length === deletedVideos.length) {
                              setSelectedVideoIds([]);
                            } else {
                              setSelectedVideoIds(deletedVideos.map(v => v.id));
                            }
                          }}
                          className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all border border-emerald-500/20"
                        >
                          {selectedVideoIds.length === deletedVideos.length ? t.deselectAll : t.selectAll}
                        </button>
                      )}
                    </div>
                    <p className="text-white/40 text-sm">Manage deleted videos. Restore them or delete permanently.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <input 
                      type="text"
                      placeholder={t.searchVideos}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/5 border border-white/5 rounded-2xl px-5 py-3 pl-12 w-64 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                    />
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                  {deletedVideos.length > 0 && (
                  <button 
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      title: t.emptyRecycleBin,
                      message: t.confirmEmptyRecycleBin,
                      onConfirm: emptyRecycleBin,
                      type: 'danger'
                    })}
                    disabled={isEmptyingRecycleBin}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-2xl font-bold transition-all disabled:opacity-50"
                  >
                    {isEmptyingRecycleBin ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                    {t.emptyRecycleBin}
                  </button>
                )}
                </div>
              </header>

              {selectedVideoIds.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-emerald-400">{selectedVideoIds.length} {t.videosSelected}</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedVideoIds([])}
                        className="text-xs text-white/40 hover:text-white underline"
                      >
                        {t.deselectAll}
                      </button>
                      {selectedVideoIds.length < deletedVideos.length && (
                        <button 
                          onClick={() => setSelectedVideoIds(deletedVideos.map(v => v.id))}
                          className="text-xs text-white/40 hover:text-white underline"
                        >
                          {t.selectAll}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setConfirmModal({
                        isOpen: true,
                        title: t.restore,
                        message: t.confirmBulkRestore,
                        onConfirm: bulkRestore,
                        type: 'info'
                      })}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold transition-all"
                    >
                      <RotateCcw size={14} />
                      {t.restore}
                    </button>
                    <button 
                      onClick={() => setConfirmModal({
                        isOpen: true,
                        title: t.permanentDelete,
                        message: t.confirmPermanentDelete,
                        onConfirm: bulkPermanentDelete,
                        type: 'danger'
                      })}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all"
                    >
                      <Trash2 size={14} />
                      {t.permanentDelete}
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deletedVideos
                  .filter(v => v.original_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((video) => (
                  <motion.div 
                    layout
                    key={video.id}
                    className={`group bg-[#111111] border rounded-[32px] overflow-hidden transition-all ${selectedVideoIds.includes(video.id) ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-white/5 hover:border-white/10'}`}
                  >
                    <div className="aspect-video bg-black/40 relative overflow-hidden opacity-75 hover:opacity-100 transition-all duration-500">
                      <video 
                        src={video.is_remote ? video.filename : `/uploads/${encodeURIComponent(video.filename)}`}
                        className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                        preload="metadata"
                      />
                      
                      {/* Selection Overlay */}
                      <button 
                        onClick={() => {
                          if (selectedVideoIds.includes(video.id)) {
                            setSelectedVideoIds(prev => prev.filter(id => id !== video.id));
                          } else {
                            setSelectedVideoIds(prev => [...prev, video.id]);
                          }
                        }}
                        className={`absolute top-4 left-4 w-6 h-6 rounded-lg border flex items-center justify-center transition-all z-10 ${selectedVideoIds.includes(video.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-black/40 border-white/20 text-transparent group-hover:text-white/20'}`}
                      >
                        <Check size={14} />
                      </button>

                      {/* Play & Metadata Overlay */}
                      <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <button 
                          onClick={() => setPlayingVideo(video)}
                          className="w-14 h-14 bg-white/90 hover:bg-white text-black rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 duration-200"
                          title="Play Video"
                        >
                          <Play size={24} fill="currentColor" className="ml-1" />
                        </button>
                      </div>

                      <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10 font-mono">
                        <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold text-white/80">
                          {formatDuration(video.duration)}
                        </div>
                        <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold text-white/80 uppercase">
                          {video.resolution}
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-lg truncate text-white/60 group-hover:text-white transition-colors">{video.original_name}</h4>
                          <p className="text-xs text-white/30 mt-1">Deleted on {format(new Date(video.created_at), 'PP')}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => restoreVideo(video.id)}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/20 hover:text-emerald-400"
                            title={t.restore}
                          >
                            <RotateCcw size={18} />
                          </button>
                          <button 
                            onClick={() => setConfirmModal({
                              isOpen: true,
                              title: t.permanentDelete,
                              message: t.confirmPermanentDelete,
                              onConfirm: () => permanentDelete(video.id),
                              type: 'danger'
                            })}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/20 hover:text-red-400"
                            title={t.permanentDelete}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {deletedVideos.length === 0 && (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                      <Trash2 size={40} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{t.recycleBin} is Empty</h3>
                      <p className="text-white/40 max-w-xs mx-auto mt-2">Deleted videos will appear here for 30 days before being permanently removed.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl space-y-8"
            >
              <header className="flex items-center gap-4">
                <button 
                  onClick={() => setIsLiveStreamMenuOpen(!isLiveStreamMenuOpen)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white"
                >
                  <Menu size={24} />
                </button>
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">{t.settings}</h2>
                  <p className="text-white/40 mt-1">Configure global streaming parameters and system preferences.</p>
                </div>
              </header>

              <div className="space-y-6">
                <div className="bg-[#111111] border border-white/5 rounded-3xl p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">System Status</label>
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${systemStatus?.ffmpeg === 'installed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {systemStatus?.ffmpeg === 'installed' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                      </div>
                      <div>
                        <p className="font-semibold">{systemStatus?.ffmpeg === 'installed' ? 'FFmpeg Engine Active' : t.ffmpegNotFound}</p>
                        <p className="text-xs text-white/40">{systemStatus?.ffmpeg_version || 'Checking system requirements...'}</p>
                        {systemStatus?.ffmpeg === 'installed' && (
                          <p className={`text-[10px] mt-1 font-medium ${systemStatus.rtmps_supported ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {systemStatus.rtmps_supported ? '✓ RTMPS (Secure) Supported' : '⚠ RTMPS Not Supported - Standard RTMP only'}
                          </p>
                        )}
                      </div>
                      <button 
                        onClick={checkSystem}
                        className="ml-auto p-2 hover:bg-white/5 rounded-lg transition-all"
                        title="Refresh Status"
                      >
                        <Activity size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">{t.systemResources}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">{t.activeStreams}</p>
                        <p className="text-xl font-semibold text-emerald-400">{systemStatus?.active_streams || 0}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">CPU Load</p>
                        <p className="text-xl font-semibold text-indigo-400">
                          {systemStatus?.cpu_load ? Math.round((systemStatus.cpu_load[0] / (systemStatus.cpu_count || 1)) * 100) : 0}%
                        </p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">{t.memoryUsage}</p>
                        <p className="text-xl font-semibold text-amber-400">{systemStatus?.memory_usage?.rss || '0MB'}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">{t.uptime}</p>
                        <p className="text-xl font-semibold text-blue-400">{systemStatus?.uptime || '0s'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={() => setConfirmModal({
                        isOpen: true,
                        title: t.stopAllStreams,
                        message: t.confirmStopAll,
                        onConfirm: stopAllStreams,
                        type: 'danger'
                      })}
                      className="w-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all border border-red-500/20"
                    >
                      <Square size={20} />
                      {t.stopAllStreams}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-2 text-sm">
                      <p className="text-indigo-300 font-medium">YouTube Streaming Guide:</p>
                      <ul className="list-disc list-inside text-white/50 space-y-1 text-xs">
                        <li>Use <span className="text-indigo-400">rtmps://a.rtmp.youtube.com:443/live2</span> for better connectivity.</li>
                        <li>Ensure your video is at least 720p for best results.</li>
                        <li>Check the "Activity" logs if the stream stops unexpectedly.</li>
                        <li>Standard RTMP (port 1935) might be blocked by some networks.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Global Authorization Setup Portal */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2 text-white">
                      <Lock size={18} className="text-emerald-400" />
                      <span>{t.securitySettings}</span>
                    </h3>
                    
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                      <p className="text-xs text-white/50 leading-relaxed">
                        Change the administrator username and password required to sign in and access the system services.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">{t.newUsername}</label>
                          <input
                            id="new-username-input"
                            type="text"
                            value={newAdminUsername}
                            onChange={(e) => setNewAdminUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/15 focus:border-emerald-500/60 focus:bg-white/10 transition-all rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none"
                            placeholder="admin"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">{t.newPassword}</label>
                          <input
                            id="new-password-input"
                            type="password"
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/15 focus:border-emerald-500/60 focus:bg-white/10 transition-all rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          id="save-auth-button"
                          onClick={() => {
                            if (!newAdminUsername.trim() || !newAdminPassword.trim()) {
                              toast.error("Please provide a valid username and password.");
                              return;
                            }
                            setConfirmModal({
                              isOpen: true,
                              title: t.changeAdminCredentials,
                              message: t.confirmUpdateCredentials,
                              onConfirm: async () => {
                                setIsUpdatingAuth(true);
                                try {
                                  const res = await authFetch("/api/auth/config", {
                                    method: "POST",
                                    body: JSON.stringify({
                                      username: newAdminUsername,
                                      password: newAdminPassword,
                                    })
                                  });
                                  if (res.ok) {
                                    toast.success(t.credentialsUpdated);
                                    setAdminUsername(newAdminUsername);
                                    setNewAdminPassword("");
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                  } else {
                                    const data = await res.json();
                                    toast.error(data.error || "Failed to update config");
                                  }
                                } catch (err) {
                                  toast.error("Network communication error");
                                } finally {
                                  setIsUpdatingAuth(false);
                                }
                              },
                              type: "info",
                            });
                          }}
                          disabled={isUpdatingAuth}
                          className="bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
                        >
                          {isUpdatingAuth ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          <span>{t.saveCredentials}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Recycle Bin removed as per user request */}
        </AnimatePresence>
      </main>

      {/* Config Modal */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfigModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#111111] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold tracking-tight">{t.configureSlot} {configSlot}</h3>
                  <button 
                    onClick={() => setIsConfigModalOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">{t.selectVideo}</label>
                    <select 
                      value={selectedVideo || ""} 
                      onChange={(e) => setSelectedVideo(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    >
                      <option value="" className="bg-[#111111]">{t.chooseVideo}</option>
                      {videos.map(v => (
                        <option key={v.id} value={v.id} className="bg-[#111111]">{v.original_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">{t.youtubeStreamKey}</label>
                    <div className="relative">
                      <input 
                        type={showStreamKey ? "text" : "password"} 
                        placeholder={t.streamKeyPlaceholder}
                        value={rtmpKey}
                        onChange={(e) => setRtmpKey(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStreamKey(!showStreamKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-all"
                      >
                        {showStreamKey ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-white/30 px-1">
                      {t.rtmpsNote}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={() => setLoopEnabled(!loopEnabled)}
                      className="flex items-center gap-3 group cursor-pointer"
                    >
                      <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${loopEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${loopEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{t.infiniteLoop}</p>
                        <p className="text-[10px] text-white/40">{t.loopNote}</p>
                      </div>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-white/60 flex items-center gap-2">
                          <Calendar size={14} className="text-emerald-400" />
                          {t.schedule}
                        </label>
                        <button 
                          onClick={() => {
                            const newState = !isScheduleEnabled;
                            setIsScheduleEnabled(newState);
                            if (!newState) setScheduledAt("");
                          }}
                          className={`w-8 h-4 rounded-full p-0.5 transition-all duration-300 ${isScheduleEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${isScheduleEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      <input 
                        type="datetime-local" 
                        value={scheduledAt}
                        disabled={!isScheduleEnabled}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className={`w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm ${!isScheduleEnabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-white/60 flex items-center gap-2">
                          <Clock size={14} className="text-red-400" />
                          {t.expire}
                        </label>
                        <button 
                          onClick={() => {
                            const newState = !isExpireEnabled;
                            setIsExpireEnabled(newState);
                            if (!newState) setExpiresAt("");
                          }}
                          className={`w-8 h-4 rounded-full p-0.5 transition-all duration-300 ${isExpireEnabled ? 'bg-red-500' : 'bg-white/10'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${isExpireEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      <input 
                        type="datetime-local" 
                        value={expiresAt}
                        disabled={!isExpireEnabled}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className={`w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm ${!isExpireEnabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsConfigModalOpen(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={saveConfig}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {t.saveChanges}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <AnimatePresence>
        {editingVideo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingVideo(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">{t.renameVideo}</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">{t.newName}</label>
                  <input 
                    type="text" 
                    value={editingVideo.name}
                    onChange={(e) => setEditingVideo({ ...editingVideo, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500/50 transition-all"
                    placeholder={t.enterVideoName}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setEditingVideo(null)}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-white/60 hover:bg-white/5 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={() => renameVideo(editingVideo.id, editingVideo.name)}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {t.saveChanges}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Combine Videos Modal */}
      <AnimatePresence>
        {isCombineModalOpen && baseVideoForCombine && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCombineModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#111111] border border-white/10 rounded-[40px] p-10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-3xl font-bold">{t.combineVideosTitle}</h3>
                  <p className="text-white/40 mt-1">{t.appendVideosTo} "{baseVideoForCombine.original_name}"</p>
                </div>
                <button 
                  onClick={() => setIsCombineModalOpen(false)}
                  className="p-3 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">{t.combinedVideoName}</label>
                  <input 
                    type="text" 
                    value={combinedVideoName}
                    onChange={(e) => setCombinedVideoName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500/50 transition-all"
                    placeholder={t.combinedVideoName + "..."}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">{t.selectVideosToAppend}</label>
                  <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {videos.filter(v => v.id !== baseVideoForCombine.id).map(video => (
                      <button 
                        key={video.id}
                        onClick={() => {
                          if (selectedVideosToAppend.includes(video.id)) {
                            setSelectedVideosToAppend(prev => prev.filter(id => id !== video.id));
                          } else {
                            setSelectedVideosToAppend(prev => [...prev, video.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedVideosToAppend.includes(video.id) ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/5 text-white/60 hover:border-white/10'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-8 bg-black rounded-lg overflow-hidden">
                            <video src={video.is_remote ? video.filename : `/uploads/${encodeURIComponent(video.filename)}`} preload="metadata" className="w-full h-full object-cover opacity-50" />
                          </div>
                          <span className="font-medium truncate">{video.original_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {selectedVideosToAppend.includes(video.id) && (
                            <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                              #{selectedVideosToAppend.indexOf(video.id) + 1}
                            </span>
                          )}
                          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${selectedVideosToAppend.includes(video.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'}`}>
                            {selectedVideosToAppend.includes(video.id) && <Check size={14} />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => setIsCombineModalOpen(false)}
                    className="flex-1 px-8 py-5 rounded-2xl font-bold text-white/60 hover:bg-white/5 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={handleCombine}
                    disabled={isCombining || selectedVideosToAppend.length === 0}
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-5 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isCombining ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                    {isCombining ? t.combiningVideos : t.combineN_Videos(selectedVideosToAppend.length + 1)}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Player Modal */}
      <AnimatePresence>
        {playingVideo && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPlayingVideo(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-6xl aspect-video bg-black rounded-[40px] overflow-hidden shadow-2xl border border-white/10"
            >
              <video 
                src={playingVideo.is_remote ? playingVideo.filename : `/uploads/${encodeURIComponent(playingVideo.filename)}`}
                controls
                autoPlay
                preload="auto"
                className="w-full h-full object-contain"
                onError={(e) => {
                  const mediaError = e.currentTarget.error;
                  console.error("Video playback error details:", {
                    code: mediaError?.code,
                    message: mediaError?.message,
                    src: e.currentTarget.src
                  });
                  toast.error("ভিডিওটি প্লে করা যাচ্ছে না। এটি সম্ভবত ব্রাউজার সাপোর্টেড ফরম্যাট নয় অথবা ফাইলটি অনেক বড়।");
                }}
              />
              <div className="absolute top-6 left-6 flex gap-2">
                <button 
                  onClick={() => setPlayingVideo(null)}
                  className="p-3 bg-black/40 hover:bg-white/10 backdrop-blur-md rounded-full transition-all text-white/60 hover:text-white border border-white/10"
                >
                  <X size={24} />
                </button>
                <a 
                  href={playingVideo.is_remote ? playingVideo.filename : `/uploads/${encodeURIComponent(playingVideo.filename)}`}
                  download={playingVideo.original_name}
                  className="p-3 bg-black/40 hover:bg-white/10 backdrop-blur-md rounded-full transition-all text-white/60 hover:text-white border border-white/10 flex items-center gap-2 px-5"
                >
                  <Upload size={20} className="rotate-180" />
                  <span className="text-xs font-bold uppercase tracking-widest">Download</span>
                </a>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none">
                <h3 className="text-2xl font-bold">{playingVideo.original_name}</h3>
                <p className="text-white/40 mt-1">{formatDuration(playingVideo.duration)} • {playingVideo.resolution} • {formatBytes(playingVideo.size)}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add URL Modal */}
      <AnimatePresence>
        {isUrlModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUrlModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
                <ExternalLink size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-2">{t.addVideoViaUrl}</h3>
              <p className="text-white/40 mb-8">{t.urlNote}</p>
              
              <div className="space-y-4 mb-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/30">{t.videoName}</label>
                  <input 
                    type="text" 
                    value={videoUrlName}
                    onChange={(e) => setVideoUrlName(e.target.value)}
                    placeholder="e.g. My GitHub Video"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/30">{t.directVideoUrl}</label>
                  <input 
                    type="url" 
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://raw.githubusercontent.com/..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsUrlModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-white/60 hover:bg-white/5 transition-all"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={handleAddUrl}
                  disabled={isAddingUrl || !videoUrl || !videoUrlName}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isAddingUrl ? <Loader2 className="animate-spin mx-auto" size={20} /> : t.addVideo}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Modal */}
      <AnimatePresence>
        {isLogModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLogModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#111111] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold tracking-tight">{t.streamLogs} - Slot {logSlot}</h3>
                  <button 
                    onClick={() => setIsLogModalOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-black rounded-2xl p-4 h-80 overflow-y-auto font-mono text-xs space-y-1 border border-white/5">
                  {currentLogs.length === 0 ? (
                    <p className="text-white/20 italic">{t.noLogs}</p>
                  ) : (
                    currentLogs.map((log, i) => (
                      <p key={i} className="text-white/60 whitespace-pre-wrap break-all">
                        {log}
                      </p>
                    ))
                  )}
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => setIsLogModalOpen(false)}
                    className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-all"
                  >
                    {t.close}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    confirmModal.type === 'danger' ? 'bg-red-500/10 text-red-400' :
                    confirmModal.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {confirmModal.type === 'danger' ? <Trash2 size={24} /> : 
                     confirmModal.type === 'warning' ? <AlertCircle size={24} /> : 
                     <CheckCircle2 size={24} />}
                  </div>
                  <h3 className="text-xl font-bold">{confirmModal.title}</h3>
                </div>
                
                <p className="text-white/60 leading-relaxed">
                  {confirmModal.message}
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-bold transition-all border border-white/10"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className={`flex-1 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg ${
                      confirmModal.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' :
                      confirmModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' :
                      'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                    } text-white`}
                  >
                    {confirmModal.confirmText || (confirmModal.type === 'danger' ? t.delete : t.confirm)}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#111111',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
          },
        }}
      />
    </div>
  );
}
