import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const LiveStreamSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  streamId: { type: String, required: true },
  streamTitle: { type: String, default: "" },
  startTime: { type: Date, default: Date.now },
  lastActiveTime: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Index for query optimization
LiveStreamSessionSchema.index({ streamId: 1, isActive: 1, lastActiveTime: -1 });
LiveStreamSessionSchema.index({ userId: 1, streamId: 1 }, { unique: true });

export type LiveStreamSessionDocument = InferSchemaType<typeof LiveStreamSessionSchema> & { _id: mongoose.Types.ObjectId };

if (mongoose.models.LiveStreamSession) {
  delete mongoose.models.LiveStreamSession;
}

export const LiveStreamSession: Model<LiveStreamSessionDocument> = mongoose.model<LiveStreamSessionDocument>("LiveStreamSession", LiveStreamSessionSchema);
