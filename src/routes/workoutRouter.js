const express = require('express')
const cloudinary = require('../lib/cloudinary')
const router = express.Router()
const Workout = require('../models/workout')
const logger = require('../utils/logger')
const middleware = require('../utils/middleware')
const exerciseService = require('../services/exercises')
const mongoose = require('mongoose')

const updateMusclesEquip = async (workout) => {
  const updateFields = ['equipment_needed', 'muscle_groups', 'secondary_muscle_groups']

  updateFields.forEach(field => {
    workout[field] = []
  })

  logger.info(workout + "before")

  for (const exercise of workout.exercises) {
    const exerciseExists = await exerciseService.getExerciseById(exercise.exerciseId)

    // logger.info(exerciseExists)

    const target_muscles = exerciseExists.data.targetMuscles
    const equipment = exerciseExists.data.equipments
    const secondary_muscles = exerciseExists.data.secondaryMuscles


    const exerciseSameEquipment = (thisEquip) => {
      return workout.equipment_needed.find(object => {
        if (object) {
          return object.equipment = thisEquip
        }
      })
    }

    const exerciseSameTargetMuscle = (thisTargetMuscle) => {
      return workout.muscle_groups.find(object => {
        if (object) {
          return object.muscle === thisTargetMuscle
        }
      })
    }

    const exerciseSameSecondaryMuscle = (thisSecMuscle) => {
      // takes a sec muscle from list of sec muscles and checks if its already in the list
      return workout.secondary_muscle_groups.find(object => {
        if (object) {
          return object.secondary_muscle === thisSecMuscle
        }
      })
    }

    equipment.forEach(equip => {
      if (!exerciseSameEquipment(equip)) {
        workout.equipment_needed.push({equipment: equip})
      }
    })

    target_muscles.forEach(muscle => {
      if(!exerciseSameTargetMuscle(muscle)) {
        workout.muscle_groups.push({muscle: muscle})
      }
    })

    secondary_muscles.forEach(muscle => {
      if(!exerciseSameSecondaryMuscle(muscle)) {
        workout.secondary_muscle_groups.push({secondary_muscle: muscle})
      }
    })

  
  }
  return workout
}

// this is for an empty workout to start, no fields should be passed
router.post("/start", middleware.protectRoute, async (request, response) => {
  try {
    const id = request.user._id.toString()
    const startedWorkout = await Workout.findOne(
      {$and: [
        { user: { $eq: id } },
        { status: { $in: ['in-progress', 'paused'] } }
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
    logger.error(`Error creating workout ${error}`)
    response.status(500).json({ message: 'Error creating workout' })
  }
})

// update workout
router.patch("/:workoutId", middleware.protectRoute, async (request, response) => {
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
router.patch("/end/:workoutId", middleware.protectRoute, async (request, response) => {
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

    if (thisWorkout.status === 'completed') {
      return response.status(404).json({ message: 'Workout already completed' })
    }
    
    if (thisWorkout.status === 'planned') {
      return response.status(404).json({ message: 'Workout which is planned cannot be ended' })
    }

    thisWorkout.end_time = new Date()
    thisWorkout.status = 'completed'

    thisWorkout.save()

    response.status(200).json({
      message: 'Workout ended',
      workout: thisWorkout,
    })
    
  } catch (error) {
    logger.error(`Error ending workout ${error}`)
    response.status(500).json({ message: "Error ending workout" })
  }
})

// pause workout
router.patch("/pause/:workoutId", middleware.protectRoute, async (request, response) => {
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
      return response.status(404).json({ message: 'Workout not found' })
    }

    if (thisWorkout.status === 'completed') {
      return response.status(404).json({ message: 'Workout already completed '})
    }

    if (thisWorkout.status === 'planned') {
      return response.status(404).json({ message: 'Planned workout cannot be paused' })
    }

    if (thisWorkout.status === 'paused') {
      return response.status(404).json({ message: 'Workout already paused' })
    }

    thisWorkout.status = 'paused'
    thisWorkout.pause_start = new Date()
    
    thisWorkout.save()

    response.status(200).json({
      message: 'Workout paused',
      workout: thisWorkout,
    })

  } catch (error) {
    logger.error(`Error pausing workout ${error}`)
    response.status(500).json({ message: 'Error pausing workout' })
  }
})

// resume workout
router.patch("/resume/:workoutId", middleware.protectRoute, async (request, response) => {
  try {
    const workoutId = new mongoose.Types.ObjectId(request.params.workoutId)
    const userId = request.user._id.toString()

    const thisWorkout = await Workout.findOne({
      $and: [
        {_id: {$eq: workoutId}},
        {user: {$eq: userId}}, 
        {status: {$eq: 'paused'}}
      ]
    })

    if (!thisWorkout) {
      return response.status(404).json({ message: 'Paused workout not found' })
    }

    thisWorkout.status = 'in-progress'

    thisWorkout.pause_end = new Date()

    thisWorkout.total_pause_time += thisWorkout.pause_end - thisWorkout.pause_start

    thisWorkout.save()

    response.status(200).json({
      message: 'Workout resumed',
      workout: thisWorkout,
    })

  } catch (error) {
    logger.error(`Error resuming workout ${error}`)
    response.status(500).json({ message: 'Error resuming workout' })
  }
})

// get details on a workout
router.get("/:workoutId", middleware.protectRoute, async (request, response) => {
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

    response.status(200).json({
      message: 'Workout found', 
      workout: thisWorkout,
    })
  } catch (error) {
    logger.error(`Error retrieving workout ${error}`)
    response.status(500).json({ message: 'Failed to retrieve workout'})
  }
})

// get all workouts for a user (with pagination)
router.get("/", middleware.protectRoute, async (request, response) => {
  // const response = await fetch("https://localhost:3001/api/workouts?page=1&limit=5")
  try {
    const userId = request.user._id.toString()
    const page = request.query.page || 1
    const limit = parseInt(request.query.limit) || 5
    const skip = (page - 1) * limit

    const workouts = await Workout.find(
      {user: {$eq: userId}}
    )
      .sort({ start_time: -1 })
      .skip(skip)
      .limit(limit)

    

    if (!workouts) {
      return response.status(404).json({ message: 'No workouts exist under this user' })
    }

    const totalWorkouts = await Workout.countDocuments({user: {$eq: userId}})

    response.status(200).json({
      message: 'Workouts found', 
      workouts: workouts,
      currentPage: page,
      totalWorkouts,
      totalPages: Math.ceil(totalWorkouts  /limit)
    })

  } catch (error) {
    logger.error(`Error retrieving workouts ${error}`)
    response.status(500).json({ message: 'Failed to retrieve workouts for this user' })
  }
})

// delete workout
router.delete("/:workoutId", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id.toString()
    const workout = await Workout.findById(request.params.workoutId)

    if (!workout) {
      return response.status(404).json({ message: 'Cannot find workout' })
    }

    // check if user is creator of workout
    if (workout.user.toString() !== userId) {
      return response.status(401).json({ message: 'Unauthorized' })
    }

    // delete image from cloudinary
    // example url: https://res.cloudinary.com/dkxvq9kuy/image/upload/v1753352612/vzcsvautsnuifrbtjpg3.jpg
    if (workout.image && workout.image.includes("cloudinary")) {
      try {

        const publicId = workout.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId)
      } catch (deleteError) {
        logger.error(`Error deleting image from cloudinary ${deleteError}`)
      }
    }

    await workout.deleteOne()

    response.status(202).json({ message: 'Workout deleted successfully' })
  } catch (error) {
    logger.error(`Error deleting workout ${error}`)
    response.status(500).json({ message: 'Failed to delete workout' })
  }
})

// Copy from another workout
router.post('/:workoutId/exercises/copy', middleware.protectRoute, async (request, response) => {
  try {
    const workoutId = new mongoose.Types.ObjectId(request.params.workoutId)
    const userId = request.user._id.toString()
    const sourceWorkoutId = request.body['source_workout_id']

    const targetWorkout = await Workout.findOne({
      $and: [
        {user: {$eq: userId}},
        {_id: {$eq: workoutId}}
      ]
    })

    const sourceWorkout = await Workout.findOne({
      $and: [
        {_id: {$eq: sourceWorkoutId}},
        {is_public: {$eq: true}},
        {allow_copying: {$eq: true}}
      ]
    })

    if (!targetWorkout) {
      return response.status(404).json({ message: 'Target workout not found' })
    }

    if (!sourceWorkout) {
      if (!sourceWorkout.is_public) {
        return response.status(404).json({ message: 'Source workout is not public' })
      }
      if (!sourceWorkout.allow_copying) {
        return response.status(404).json({ message: 'Source workout not copyable'})
      }
      return response.status(404).json({ message: 'Source workout not found' })
    }

    let currentOrder = targetWorkout.exercises.length + 1 

    const copiedExercises = sourceWorkout.exercises.map((exercise, index) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      order: currentOrder + index,
      sets: exercise.sets.map(set => ({
        set_number: set.set_number,
        reps: set.reps,
        weight: set.weight,
        completed: false,
        rest_time: set.rest_time,
        notes: undefined,
      })),
      notes: exercise.notes,
      added_at: new Date()
    }))

    targetWorkout.exercises.push(...copiedExercises) // instead of pushing one by one, the spread syntax (...) allows you to push the entire array in one line

    targetWorkout.updated_at = new Date()

    await targetWorkout.save()

    sourceWorkout.copied_from = request.params.workoutId

    await sourceWorkout.save()

    response.json({
      message: `${copiedExercises.length} exercises copied to workout`,
      copiedExercises: copiedExercises,
      workout: targetWorkout
    })

  } catch (error) {
    logger.error(`Error copying exercises ${error}`)
    response.status(500).json({ message: 'Failed to copy exercises' })
  }
})

// Adding exercise
router.post("/:workoutId/exercises", middleware.protectRoute, async (request, response) => {

  try {
    const workoutId = new mongoose.Types.ObjectId(request.params.workoutId)
    const userId = request.user._id.toString()
    const {
      exerciseId,
      name,
      sets,
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

    if (thisWorkout.status === 'completed') {
      return response.status(400).json({ message: 'Cannot added exercises to a completed workout' })
    }

    const exerciseExists = await exerciseService.getExerciseById(exerciseId)

    if (exerciseExists.status !== 200) {
      response.status(400).json({ message: 'Invalid exercise ID' })
    }


    const exercisePosition = position || thisWorkout.exercises.length + 1

    const newExercise = {
      exerciseId,
      name: name || exerciseExists.data.name,
      sets: sets || [],
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

    thisWorkout.exercises.push(newExercise)

    // updating equipment needed and muscle groups for workout

    await updateMusclesEquip(thisWorkout)

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
router.patch("/:workoutId/exercises/:exerciseId", middleware.protectRoute, async (request, response) => {
  try {
    const workoutId = new mongoose.Types.ObjectId(request.params.workoutId)
    const userId = request.user._id.toString()
    const exerciseId = request.params.exerciseId.toString() // this is not api exercise id but the exercise instance id

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

    const allowedFields = ['sets', 'notes', 'order']
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

// Update set
router.patch("/:workoutId/exercises/:exerciseId/sets/:setId", middleware.protectRoute, async (request, response) => {
  try {
    const workoutId = new mongoose.Types.ObjectId(request.params.workoutId)
    const userId = request.user._id.toString()
    const exerciseId = request.params.exerciseId.toString() // this is not api exercise id but the exercise instance id
    const setId = request.params.setId.toString()

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

    const setIndex = thisWorkout.exercises[exerciseIndex].sets.findIndex(
      set => set._id.toString() === setId
    )

    if (setIndex === -1) {
      return response.status(404).json({ message: "Set not found in workout" })
    }

    const allowedFields = ['reps', 'weight', 'completed', 'notes']
    allowedFields.forEach(field => {
      if (updateData[field] != undefined) {
        thisWorkout.exercises[exerciseIndex].sets[setIndex][field] = updateData[field]
      }
    })

    thisWorkout.exercises[exerciseIndex].updated_at = new Date()
    thisWorkout.updated_at = new Date()

    await thisWorkout.save()

    response.status(200).json({
      message: 'Set updated',
      exercise: thisWorkout.exercises[exerciseIndex],
      workout: thisWorkout,
    })


  } catch (error) {
    logger.error(`Error updating set ${error}`)
    response.status(500).json({ message: 'Failed to update set' })
  }
})

// Add set(s)
router.post("/:workoutId/exercises/:exerciseId/sets", middleware.protectRoute, async (request, response) => {
  try {
    const workoutId = new mongoose.Types.ObjectId(request.params.workoutId)
    const userId = request.user._id.toString()
    const exerciseId = request.params.exerciseId.toString() // this is not api exercise id but the exercise instance id

    const sets = request.body.sets

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

    let numberOfSets = thisWorkout.exercises[exerciseIndex].sets.length
    

    sets.map(set => {
      set.set_number = numberOfSets++
      thisWorkout.exercises[exerciseIndex].sets.push(set)
    })

    thisWorkout.exercises[exerciseIndex].updated_at = new Date()
    await thisWorkout.save()

    response.status(201).json({
      message: 'Exercise set added', 
      exercise: thisWorkout.exercises[exerciseIndex],
      workout: thisWorkout,
    })

  } catch (error) {
    logger.error(`Error adding exercise ${error}`)
    response.status(500).json({ message: 'Failed to add exercise' })
  }
})

// Delete set
router.delete("/:workoutId/exercises/:exerciseId/sets/:setId", middleware.protectRoute, async (request, response) => {
  try {
    const workoutId = new mongoose.Types.ObjectId(request.params.workoutId)
    const userId = request.user._id.toString()
    const exerciseId = request.params.exerciseId.toString() // this is not api exercise id but the exercise instance id
    const setId = request.params.setId

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

    const setIndex = thisWorkout.exercises[exerciseIndex].sets.findIndex(set => set._id.toString() === setId)

    if (setIndex === -1) {
      return response.status(404).json({ message: "Set not found in workout" })
    }

    thisWorkout.exercises[exerciseIndex].sets.splice(setIndex, 1)

    thisWorkout.exercises[exerciseIndex].sets.map((set, index) => {
      if (index >= setIndex) {
        set.set_number -= 1
        return set
      }
    })

    thisWorkout.exercises[exerciseIndex].updated_at = new Date()
    thisWorkout.updated_at = new Date()
    await thisWorkout.save()

    response.status(200).json({
      message: 'Set deleted successfully',
      workout: thisWorkout,
    })

  } catch (error) {
    logger.error(`Error deleting set ${error}`)
    response.status(500).json({ message: 'Failed to delete set' })
  }
})

// delete exercise
router.delete("/:workoutId/exercises/:exerciseId", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id.toString()
    const workout = await Workout.findById(request.params.workoutId)
    const exerciseId = request.params.exerciseId.toString()

    if (!workout) {
      return response.status(404).json({ message: 'Cannot find workout' })
    }

    // check if user is creator of workout
    if (workout.user.toString() !== userId) {
      return response.status(401).json({ message: 'Unauthorized' })
    }

    const exerciseIndex = workout.exercises.findIndex(
      exercise => exercise._id.toString() === exerciseId
    )

    if (exerciseIndex === -1) {
      return response.status(404).json({ message: "Exercise not found in workout"})
    }

    workout.exercises.splice(exerciseIndex, 1)

    workout.updated_at = new Date()

    await updateMusclesEquip(workout)

    await workout.save()

    response.status(202).json({
      message: 'Successfully deleted exercise',
      workout: workout
    })
  } catch (error) {
    logger.error(`Error deleting exercise ${error}`)
    response.status(500).json({ message: 'Failed to delete exercise' })
  }
})



module.exports = router