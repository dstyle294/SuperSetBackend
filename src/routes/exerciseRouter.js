const express = require('express')

const router = express.Router()
const exerciseService = require('../services/exercises')
const logger = require('../utils/logger')

// general
router.get("/", async (request, response) => {
  try {
    const exercises = await exerciseService.getAllExercises()
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
    response.status(200).json({
      exercise,
    })
  } catch (error) {
    response.status(404).json({ message: 'Exercise not found' })
  }
})

// body part list
router.get("/bodyPartList", async (request, response) => {
  try {
    const bodyParts = await exerciseService.getBodyPartList()
    response.status(200).json({
      bodyParts,
    })
  } catch (error) {
    response.status(404).json({ message: 'Body parts list not found' })
  }
})

// by body part
router.get("/bodyPart/:bodyPart", async (request, response) => {
  try {
    const bodyPart = request.params.bodyPart
    const exercises = await exerciseService.getExerciseByBodyPart(bodyPart)
    response.status(200).json({
      exercises,
    })
  } catch (error) {
    response.status(404).json({ message: 'Exercises not found by body part'})
  }
})

// equipment list
router.get("/equipmentList", async (request, response) => {
  try {
    const equipments = await exerciseService.getEquipmentList()
    response.status(200).json({
      equipments,
    })
  } catch (error) {
    response.status(404).json({ message: 'Equipment list not found' })
  }
})

// by equipment
router.get("/equipment/:equipment", async (request, response) => {
  try {
    const equipment = request.params.equipment
    const exercises = await exerciseService.getExerciseByEquipment(equipment)
    response.status(200).json({
      exercises,
    })
  } catch (error) {
    response.status(404).json({ message: 'Exercises not found by equipment'})
  }
})

// target list
router.get("/targetList", async (request, response) => {
  try {
    const targets = await exerciseService.getTargetList()
    response.status(200).json({
      targets,
    })
  } catch (error) {
    response.status(404).json({ message: 'Targets not found' })
  }
})

// by target
router.get("/target/:target", async (request, response) => {
  try {
    const target = request.params.target
    const exercises = await exerciseService.getExerciseByTarget(target)
    response.status(200).json({
      exercises,
    })
  } catch (error) {
    response.status(404).json({ message: 'Exercises not found by target'})
  }
})

// by name
router.get("/name/:name", async (request, response) => {
  try {
    const name = request.params.name
    const exercises = await exerciseService.getExercisesByName(name)
    response.status(200).json({
      exercises,
    })
  } catch (error) {
    response.status(404).json({ message: 'Exercise not found by name' })
  }
})




module.exports = router