const mongoose = require('mongoose')

const workoutSchema = mongoose.Schema({
  exercises: [{
    api_exercise_id: String,
    name: String,
    order: Number,
    sets: Number,
    reps: Number,
    weight: Number,
    rest_time: Number,
    notes: String,
    added_at: {type: Date, default: null},
  }],
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
  }],
  muscle_groups: [{
    muscles: String,
  }], 
  scheduled_duration: Number,
  start_time: { type: Date, default: null},
  end_time: { type: Date, default: null},

  actual_duration: {
    type: Number,
    get: () => {
      if (start_time && end_time) {
        return Math.round((end_time - start_time))
      }
      return null
    }
  },
  updated_at: { type: Date, default: null },
  status: {
    type: String,
    enum: ['planned', 'in-progress', 'completed', 'paused'],
    default: 'planned',
  }
})

const Workout = new mongoose.model('Workout', workoutSchema)

module.exports = Workout