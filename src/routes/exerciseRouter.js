const express = require('express')

const router = express.Router()
const exerciseService = require('../services/exercises')
const logger = require('../utils/logger')

// general
router.get("/", async (request, response) => {
  try {
    const page = parseInt(request.query.page) || 1
    const limit = parseInt(request.query.limit) || 10
    const skip = (page - 1) * limit

    const exercises = await exerciseService.getAllExercises(page, limit, skip)
    response.status(200).json({
      exercises,
    })
  } catch (error) {
    logger.error(`Error in retrieving exercises`)
    response.status(404).json({ message: 'Exercise API error' })
  }
})

// by id
router.get("/id/:id", async (request, response) => {
  try {
    const id = request.params.id
    const exercise = await exerciseService.getExerciseById(id)

    if (!exercise.data) { 
      throw new Error()
    }

    response.status(200).json({
      exercise,
    })
  } catch (error) {
    response.status(404).json({ message: 'Exercise not found' })
  }
})

// body part list
router.get("/bodyPart/", async (request, response) => {
  try {
    const page = parseInt(request.query.page) || 1
    const limit = parseInt(request.query.limit) || 10
    const skip = (page - 1) * limit

    const bodyParts = await exerciseService.getBodyPartList(page, limit, skip)

    if (!bodyParts.data) {
      throw new Error()
    }

    response.status(200).json({
      bodyParts,
    })
  } catch (error) {
    response.status(404).json({ message: 'Body parts list not found' })
  }
})

// exercises by body part
router.get("/bodyPart/:bodyPart", async (request, response) => {
  try {
    const page = parseInt(request.query.page) || 1
    const limit = parseInt(request.query.limit) || 10
    const skip = (page - 1) * limit

    const bodyPart = request.params.bodyPart
    const exercises = await exerciseService.getExercisesByBodyPart(bodyPart, page, limit, skip)
    response.status(200).json({
      exercises,
    })
  } catch (error) {
    response.status(404).json({ message: 'Exercises not found by body part'})
  }
})

// equipment list
router.get("/equipment", async (request, response) => {
  try {
    const page = parseInt(request.query.page) || 1
    const limit = parseInt(request.query.limit) || 10
    const skip = (page - 1) * limit

    const equipments = await exerciseService.getEquipmentList(page, limit, skip)
    response.status(200).json({
      equipments,
    })
  } catch (error) {
    response.status(404).json({ message: 'Equipment list not found' })
  }
})

// exercises by equipment
router.get("/equipment/:equipment", async (request, response) => {
  try {
    const page = parseInt(request.query.page) || 1
    const limit = parseInt(request.query.limit) || 10
    const skip = (page - 1) * limit

    const equipment = request.params.equipment
    const exercises = await exerciseService.getExerciseByEquipment(equipment, page, limit, skip)
    response.status(200).json({
      exercises,
    })
  } catch (error) {
    response.status(404).json({ message: 'Exercises not found by equipment'})
  }
})

// muscle list
router.get("/muscle", async (request, response) => {
  try {
    const page = parseInt(request.query.page) || 1
    const limit = parseInt(request.query.limit) || 10
    const skip = (page - 1) * limit

    const muscles = await exerciseService.getMuscleList(page, limit, skip)
    response.status(200).json({
      muscles,
    })
  } catch (error) {
    response.status(404).json({ message: 'Targets not found' })
  }
})

// target list
router.get("/target", async (request, response) => {
  try {
    const page = parseInt(request.query.page) || 1
    const limit = parseInt(request.query.limit) || 10
    const skip = (page - 1) * limit

    const targets = await exerciseService.getTargetList(page, limit, skip)
    response.status(200).json({
      targets,
    })
  } catch (error) {
    response.status(404).json({ message: 'Targets not found' })
  }
})

// exercises by target
router.get("/target/:target", async (request, response) => {
  try {
    const page = parseInt(request.query.page) || 1
    const limit = parseInt(request.query.limit) || 10
    const skip = (page - 1) * limit

    const target = request.params.target
    const exercises = await exerciseService.getExerciseByTarget(target, page, limit, skip)
    response.status(200).json({
      exercises,
    })
  } catch (error) {
    response.status(404).json({ message: 'Exercises not found by target'})
  }
})

// by name
router.get(`/name/:name`, async (request, response) => {
  try { 
    const name = request.params.name
    const page = parseInt(request.query.page) || 1
    const limit = parseInt(request.query.limit) || 10
    const skip = (page - 1) * limit

    const exercises = await exerciseService.getExercisesByName(name, page, limit, skip)
    response.status(200).json({
      exercises,
    })
  } catch (error) {
    response.status(404).json({ message: 'Exercise not found by name' })
  }
})

module.exports = router