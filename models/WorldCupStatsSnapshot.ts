import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const WorldCupStatsSnapshotSchema = new Schema({
  tournamentKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  source: {
    type: String,
    required: true
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true
  },
  fetchedAt: {
    type: Date,
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

export type WorldCupStatsSnapshotDocument = InferSchemaType<typeof WorldCupStatsSnapshotSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WorldCupStatsSnapshot: Model<WorldCupStatsSnapshotDocument> =
  mongoose.models.WorldCupStatsSnapshot as Model<WorldCupStatsSnapshotDocument> ||
  mongoose.model<WorldCupStatsSnapshotDocument>("WorldCupStatsSnapshot", WorldCupStatsSnapshotSchema);
