const mongoose = require('mongoose')

const workoutSchema = mongoose.Schema({
  exercises: [{
    api_exercise_id: String,
    name: String,
    order: Number,
    sets: [
      { set_number: Number, reps: Number, weight: Number, completed: { type: Boolean, default: false }, notes: String }
    ],
    notes: String,
    added_at: {type: Date, default: null},
  }],
  is_public: {type: Boolean, default: true},
  allow_copying: {type: Boolean, default: true},
  copied_from: {type: String, default: null},
  description: {
    type: String,
  },
  title: {
    type: String,
  },
  image: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  calories_burned: Number,
  equipment_needed: [{
    equipment: String,
    _id: false,
  }],
  muscle_groups: [{
    muscle: String,
    _id: false,
  }], 
  secondary_muscle_groups: [{
    secondary_muscle: String,
    _id: false,
  }],
  scheduled_duration: Number,
  start_time: { type: Date, default: null},
  end_time: { type: Date, default: null},

  pause_start: { type: Date, default: null },
  pause_end: { type: Date, default: null },

  total_pause_time: { type: Number, default: 0 },

  total_duration: {
    type: Number,
    get: function() {
      if (this.start_time && this.end_time) {
        return Math.round((this.end_time - this.start_time) / 1000) // now it will be in seconds
      }
      return null
    }
  },

  actual_duration: {
    type: Number,
    get: function() {
      if (this.total_duration) {
        return Math.round(this.total_duration - (this.total_pause_time / 1000));
      }
    }
  },
  updated_at: { type: Date, default: null },
  status: {
    type: String,
    enum: ['planned', 'in-progress', 'completed', 'paused'],
    default: 'planned',
  }
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
})

const Workout = new mongoose.model('Workout', workoutSchema)

module.exports = Workout