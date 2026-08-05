import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  sessionId: string;
  userId?: string;
  startedAt: Date;
  lastActiveAt: Date;
  durationSeconds: number;
  pageViewsCount: number;
  eventsCount: number;
  entryPage: string;
  exitPage: string;
  isBounce: boolean;
  device: Record<string, any>;
  geo: Record<string, any>;
  userTraits?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    startedAt: { type: Date, required: true, index: true },
    lastActiveAt: { type: Date, required: true },
    durationSeconds: { type: Number, default: 0 },
    pageViewsCount: { type: Number, default: 0 },
    eventsCount: { type: Number, default: 0 },
    entryPage: { type: String, default: '/' },
    exitPage: { type: String, default: '/' },
    isBounce: { type: Boolean, default: true },
    device: { type: Schema.Types.Mixed, default: {} },
    geo: { type: Schema.Types.Mixed, default: {} },
    userTraits: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SessionSchema.index({ projectId: 1, startedAt: -1 });

export const SessionModel =
  (mongoose.models.Session as mongoose.Model<ISession>) ||
  mongoose.model<ISession>('Session', SessionSchema);
