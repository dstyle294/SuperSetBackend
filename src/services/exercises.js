const config = require('../utils/config')
const axios = require('axios')
const base_url = 'https://exercisedb.p.rapidapi.com/'
const logger = require('../utils/logger')
const allExercises = require('../assets/exercises.json')
const bodyParts = require('../assets/bodyparts.json')
const equipments = require('../assets/equipments.json')
const muscles = require('../assets/muscles.json')
const targets = require('../assets/targets.json')
const api_key = config.EXERCISEDB_KEY
const suffix = `rapidapi-key=${api_key}`

async function getAllExercises(pageNum, limit, skip) {
  const totalPages = Math.ceil(allExercises.length / limit)
  const slicedExercises = allExercises.slice(skip, skip + limit)
  return {
    status: 200,
    data: slicedExercises,
    pageNum,
    count: slicedExercises.length,
    totalExercises: allExercises.length,
    totalPages,
    totalExercises: allExercises.length,
    message: 'Success',
  }
}


async function getExerciseById(id) {
  try {
    const exercise = allExercises.find(exercise => exercise.exerciseId === id)

    return {
      status: 200,
      data: exercise,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching exercise by id`)
    return error;
  }
}

async function getBodyPartList(pageNum, limit, skip) {
  try {
    const pages = Math.ceil(bodyParts.length / limit)
    const totalBodyParts = bodyParts.length
    const bodyPartsSliced = bodyParts.slice(skip, skip + limit)
    return {
      status: 200,
      data: bodyPartsSliced,
      count: bodyPartsSliced.length,
      pageNum,
      totalPages: pages,
      totalBodyParts,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching body part list`)
    return error
  }
}

async function getExercisesByBodyPart(bodyPart, pageNum, limit, skip) {
  try {
    const exercises = allExercises.filter(exercise => exercise.bodyParts.includes(bodyPart))
    const slicedExercises = exercises.slice(skip, skip + limit)
    const totalExercises = exercises.length
    const totalPages = Math.ceil(totalExercises / limit)

    return {
      status: 200,
      data: slicedExercises,
      pageNum,
      totalPages,
      count: slicedExercises.length,
      totalExercises,
      message: 'Success',
    }

  } catch (error) {
    logger.error(`Error in fetching exercise by body part`)
    return error;
  }
}

async function getEquipmentList(pageNum, limit, skip) {
  try {
    const pages = Math.ceil(equipments.length / limit)
    const totalEquipment = equipments.length
    const equipmentSliced = equipments.slice(skip, skip + limit)

    return {
      status: 200,
      data: equipmentSliced,
      count: equipmentSliced.length,
      pageNum,
      totalPages: pages,
      totalEquipment,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching equipment list`)
    return error
  }
}

async function getExerciseByEquipment(equipment, pageNum, limit, skip) {
  try {
    const exercises = allExercises.filter(exercise => exercise.equipments.includes(equipment))
    const slicedExercises = exercises.slice(skip, skip + limit)
    const totalExercises = exercises.length
    const totalPages = Math.ceil(totalExercises / limit)

    return {
      status: 200,
      data: slicedExercises,
      pageNum,
      totalPages,
      count: slicedExercises.length,
      totalExercises,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching exercise by equipment`)
    return error;
  }
}

async function getMuscleList(pageNum, limit, skip) {
  try {
    const pages = Math.ceil(muscles.length / limit)
    const totalMuscles = muscles.length
    const muscleSliced = muscles.slice(skip, skip + limit)

    return {
      status: 200,
      data: muscleSliced,
      count: muscleSliced.length,
      pageNum,
      totalPages: pages,
      totalMuscles,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching muscle list ${error}`)
    return error
  }
}

async function getTargetList(pageNum, limit, skip) {
  try {
    const pages = Math.ceil(targets.length / limit)
    const totalTargets = targets.length
    const targetSliced = targets.slice(skip, skip + limit)

    return {
      status: 200,
      data: targetSliced,
      count: targetSliced.length,
      pageNum,
      totalPages: pages,
      totalTargets,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching target list ${error}`)
    return error
  }
}

async function getExerciseByTarget(target, pageNum, limit, skip) {
  try {
    const exercises = allExercises.filter(exercise => exercise.targetMuscles.includes(target))
    const slicedExercises = exercises.slice(skip, skip + limit)
    const totalExercises = exercises.length
    const totalPages = Math.ceil(totalExercises / limit)


    return {
      status: 200,
      data: slicedExercises,
      pageNum,
      totalPages,
      count: slicedExercises.length,
      totalExercises,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching exercise by target`)
    return error;
  }
}

async function getExercisesByName(name, pageNum, limit, skip) {
  try {
    const query = name.toLowerCase()
    const exercises = allExercises.filter(exercise => 
      exercise.name.includes(query)
    )
    const slicedExercises = exercises.slice(skip, skip + limit)
    const totalExercises = exercises.length
    const totalPages = Math.ceil(totalExercises / limit)

    return {
      status: 200,
      data: slicedExercises,
      pageNum,
      totalPages,
      count: slicedExercises.length,
      totalExercises,
      message: 'Success',
    }
    
  } catch (error) {
    logger.error(`Error in fetching exercise by name`)
    return error
  }
}



module.exports = { getAllExercises, getExerciseById, getBodyPartList, getExercisesByBodyPart, getExerciseByEquipment, getEquipmentList, getMuscleList, getTargetList, getExerciseByTarget, getExercisesByName }