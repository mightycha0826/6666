export type MessageRole = "student" | "ai" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
}

export interface UserData {
  id: string;
  name: string;
  email?: string;
}

export interface ReportMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: number;
  keyFindings: string[];
  methodology: string[];
  coreArguments: string[];
  rawText?: string;
}

export interface UploadProgress {
  percent: number;
  status: "idle" | "uploading" | "processing" | "done" | "error";
  error?: string;
}
