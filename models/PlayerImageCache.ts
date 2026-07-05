import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PlayerImageCacheSchema = new Schema({
  playerKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  playerName: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  sourcePhoto: {
    type: String
  },
  resolvedUrl: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ["api", "wikipedia", "default"],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

export type PlayerImageCacheDocument = InferSchemaType<typeof PlayerImageCacheSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PlayerImageCache: Model<PlayerImageCacheDocument> =
  mongoose.models.PlayerImageCache as Model<PlayerImageCacheDocument> ||
  mongoose.model<PlayerImageCacheDocument>("PlayerImageCache", PlayerImageCacheSchema);
