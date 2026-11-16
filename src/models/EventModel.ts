import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  sessionId: string;
  userId?: string;
  type: 'pageview' | 'custom' | 'click' | 'error' | 'performance' | 'heartbeat' | 'identify';
  data: Record<string, any>;
  device?: Record<string, any>;
  geo?: Record<string, any>;
  timestamp: Date;
}

// Raw events auto-expire so the database stays inside the Atlas free tier (512 MB).
// Aggregated per-visit data lives on Session documents and is kept.
export const EVENT_RETENTION_DAYS = Math.max(1, Number(process.env.EVENT_RETENTION_DAYS) || 30);

const EventSchema = new Schema<IEvent>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    sessionId: { type: String, required: true, index: true },
    userId: { type: String },
    type: {
      type: String,
      enum: ['pageview', 'custom', 'click', 'error', 'performance', 'heartbeat', 'identify'],
      required: true,
    },
    data: { type: Schema.Types.Mixed, default: {} },
    // Only set on error/custom/identify events (slim copy); everything else reads it from the Session
    device: { type: Schema.Types.Mixed },
    geo: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  {
    // No createdAt/updatedAt/__v: `timestamp` is enough and saves ~60 bytes per event
    timestamps: false,
    versionKey: false,
    minimize: true,
  }
);

// TTL — MongoDB deletes events older than the retention window in the background
EventSchema.index({ timestamp: 1 }, { expireAfterSeconds: EVENT_RETENTION_DAYS * 86400, name: 'timestamp_ttl' });
// Compound indexes for analytics queries (also cover projectId-only lookups via prefix)
EventSchema.index({ projectId: 1, type: 1, timestamp: -1 });
EventSchema.index({ projectId: 1, timestamp: -1 });

export const EventModel =
  (mongoose.models.Event as mongoose.Model<IEvent>) ||
  mongoose.model<IEvent>('Event', EventSchema);
