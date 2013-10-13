/**
 * Notification Schema
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Schemas

// TODO: MUST CREATE A COMPOUND INDEX HERE

var NotificationSchema = new Schema({
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date
  },
  app_id: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  api_key: {
    type: String
  },
  message_text: {
    type: String
  },
  message_title: {
    type: String
  },
  message_image: {
    type: String
  },
  channel_namespace: {
    type: String
  },
  channel: {
    type: String
  },
  message_date: {
    type: Date
  }
});

NotificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (!this.createdAt) {
    this.createdAt = new Date();
  }
  next();
});

module.exports = mongoose.model("Notification", NotificationSchema);