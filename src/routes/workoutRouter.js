const express = require('express')
const cloudinary = require('../lib/cloudinary')
const router = express.Router()
const Workout = require('../models/workout')
const logger = require('../utils/logger')
const middleware = require('../utils/middleware')
const exerciseService = require('../services/exercises')
const mongoose = require('mongoose')

// this is for an empty workout to start, no fields should be passed
router.post("/start", middleware.protectRoute, async (request, response) => {
  try {
    const id = request.user._id.toString()
    const startedWorkout = await Workout.findOne(
      {$and: [
        { user: { $eq: id } },
        { status: { $eq: 'in-progress' } }
             ]
      }
    )

    logger.info(startedWorkout)

    if (startedWorkout) {
      return response.status(400).json({ message: 'Only one workout can be started at a time' })
    }
    
    // const { description, title, image } = request.body || {};

    const start_time = new Date()
    const status = 'in-progress'

    const newWorkout = new Workout({
      status,
      start_time,
      user: request.user._id,
      updated_at: start_time,
    })

    // get timezone from frontend

    // if (description) {
    //   // add description
    //   newWorkout.description = description
    // } // if no description provided, generate an AI based description

    // if (title) {
    //   // add title
    //   newWorkout.title = title
    // } else {
    const hours = start_time.getUTCHours()
    let title = ""
    if (hours >= 0 && hours <= 7) {
      title = "Early morning workout"
    } else if (hours <= 11) {
      title = "Morning workout"
    } else if (hours <= 15) {
      title = "Afternoon workout"
    } else if (hours <= 20) {
      title = "Evening workout"
    } else {
      title = "Late night workout"
    }

    newWorkout.title = title
    // }

    // if (image) {
    //   // upload image to cloudinary
    //   const uploadResponse = await cloudinary.uploader.upload(image)
    //   const imageUrl = uploadResponse.secure_url
    //   // save to the database
    //   newWorkout.image = imageUrl
    // }


    await newWorkout.save()

    response.status(201).json(newWorkout)

  } catch (error) {
    logger.error('Error creating workout')
    response.status(500).json({ message: 'Error creating workout' })
  }
})

// update workout
router.put("/update/:workoutId", middleware.protectRoute, async (request, response) => {
  try {
    const workoutId = new mongoose.Types.ObjectId(request.params.workoutId)
    const userId = request.user._id.toString()
    const updateData = request.body

    const thisWorkout = await Workout.findOne({
      $and: [
        {_id: {$eq: workoutId}},
        {user: {$eq: userId}}
      ]
    })

    if (!thisWorkout) {
      return response.status(404).json({ message: "Workout not found" })
    }

    const allowedFields = ['description', 'title', 'calories_burned', 'start_time']

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        thisWorkout[field] = updateData[field] // the [] syntax is used for accessing dynamic field names, which is the case here
      } 
    })

    if (updateData.image) {
      // upload image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(updateData.image)
      const imageUrl = uploadResponse.secure_url
      thisWorkout.image = imageUrl
    }

    thisWorkout.updated_at = new Date()
  
    await thisWorkout.save()

    response.json({
      message: 'Workout updated', 
      workout: thisWorkout,
    })

  } catch (error) {
    logger.error(`Error updating workout ${error}`)
    response.status(500).json({ message: 'Failed to update workout' })
  }
})

// end workout
router.post("/end/:workoutId", middleware.protectRoute, async (request, response) => {
  try {
    const workoutId = new mongoose.Types.ObjectId(request.params.workoutId)
    const userId = request.user._id.toString()

    const thisWorkout = await Workout.findOne({
      $and: [
        {_id: {$eq: workoutId}},
        {user: {$eq: userId}}
      ]
    })

    if (!thisWorkout) {
      return response.status(404).json({ message: "Workout not found" })
    }

    thisWorkout.end_time = new Date()
    thisWorkout.status = 'completed'

    thisWorkout.save()

    
  } catch (error) {
    
  }
})

// TODO: pause workout

// TODO: delete workout

// TODO: copy from another workout

router.post("/:workoutId/exercises", middleware.protectRoute, async (request, response) => {
  

  try {
    const workoutId = new mongoose.Types.ObjectId(request.params.workoutId)
    const userId = request.user._id.toString()
    const {
      api_exercise_id,
      name,
      sets,
      reps, 
      weight, 
      rest_time,
      notes,
      position,
    } = request.body

    const thisWorkout = await Workout.findOne({
      $and: [
        {_id: {$eq: workoutId}},
        {user: {$eq: userId}}
      ]
    })

    if (!thisWorkout) {
      return response.status(404).json({ message: "Workout not found" })
    }

    const exerciseExists = await exerciseService.getExerciseById(api_exercise_id)
    if (exerciseExists.status !== 200) {
      response.status(400).json({ message: 'Invalid exercise ID' })
    }

    const exercisePosition = position || thisWorkout.exercises.length + 1

    const newExercise = {
      api_exercise_id,
      name: name || exerciseExists.data.name,
      sets: sets || 1,
      reps: reps || null,
      weight: weight || null,
      rest_time: rest_time || 120,
      notes: notes || '',
      updated_at: new Date(),
      order: exercisePosition,
    }

    if (position && position <= thisWorkout.exercises.length) {
      thisWorkout.exercises.forEach(exercise => {
        if (exercise.order >= position) {
          exercise.order += 1
        }
      })
    }

    // TODO: update equipment needed and muscle groups

    thisWorkout.exercises.push(newExercise)
    thisWorkout.updated_at = new Date()

    await thisWorkout.save()

    response.status(201).json({
      exercise: newExercise,
      workout: thisWorkout,
    })

  } catch (error) {
    logger.error(`Error adding exercise ${error}`)
    response.status(500).json({ message: 'Failed to add exercise to workout' })
  }
})

// Updating exercise
router.put("/:workoutId/exercises/:exerciseId", middleware.protectRoute, async (request, response) => {
  try {
    const workoutId = new mongoose.Types.ObjectId(request.params.workoutId)
    const userId = request.user._id.toString()
    const exerciseId = request.params.exerciseId // this is not api exercise id but the exercise instance id

    const updateData = request.body

    const thisWorkout = await Workout.findOne({
      $and: [
        {_id: {$eq: workoutId}},
        {user: {$eq: userId}}
      ]
    })

    if (!thisWorkout) {
      return response.status(404).json({ message: "Workout not found" })
    }

    const exerciseIndex = thisWorkout.exercises.findIndex(
      exercise => exercise._id.toString() === exerciseId
    )

    if (exerciseIndex === -1) {
      return response.status(404).json({ message: "Exercise not found in workout"})
    }

    const allowedFields = ['sets', 'reps', 'weight', 'duration', 'rest_time', 'notes', 'order']
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        thisWorkout.exercises[exerciseIndex][field] = updateData[field]
      }
    })

    thisWorkout.exercises[exerciseIndex].updated_at = new Date()
    thisWorkout.updated_at = new Date()

    await thisWorkout.save()

    response.json({
      message: 'Exercise updated',
      exercise: thisWorkout.exercises[exerciseIndex],
      workout: thisWorkout,
    })
  } catch (error) {
    logger.error(`Error updating exercise ${error}`)
    response.status(500).json({ message: 'Failed to update exercise' })
  }
})

// TODO: delete exercise

// TODO: get full exercise info




module.exports = router