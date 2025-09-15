const config = require('../utils/config')
const axios = require('axios')
const base_url = 'https://exercisedb.p.rapidapi.com/'
const logger = require('../utils/logger')

const api_key = config.EXERCISEDB_KEY
const suffix = `rapidapi-key=${api_key}`

async function getAllExercises() {
  try {
    const request = await axios.get(`${base_url}exercises?${suffix}`)
    return {
      status: 200,
      data: request.data,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching exercises`)
    return error;
  }
}

async function getExerciseById(id) {
  try {
    const request = await axios.get(`${base_url}exercises/exercise/${id}?${suffix}`)
    return {
      status: 200,
      data: request.data,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching exercise by id`)
    return error;
  }
}

async function getBodyPartList() {
  try {
    const request = await axios.get(`${base_url}exercises/bodyPartList?${suffix}`)
    return {
      status: 200,
      data: request.data,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching body part list`)
    return error
  }
}

async function getExerciseByBodyPart(bodyPart) {
  try {
    const request = await axios.get(`${base_url}exercises/bodyPart/${bodyPart}?${suffix}`)
    return {
      status: 200,
      data: request.data,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching exercise by body part`)
    return error;
  }
}

async function getEquipmentList() {
  try {
    const request = await axios.get(`${base_url}exercises/equipmentList?${suffix}`)
    return {
      status: 200,
      data: request.data,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching equipment list`)
    return error
  }
}

async function getExerciseByEquipment(equipment) {
  try {
    const request = await axios.get(`${base_url}exercises/equipment/${equipment}?${suffix}`)
    return {
      status: 200,
      data: request.data,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching exercise by equipment`)
    return error;
  }
}

async function getTargetList() {
  try {
    const request = await axios.get(`${base_url}exercises/targetList?${suffix}`)
    return {
      status: 200,
      data: request.data,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching target list`)
    return error
  }
}

async function getExerciseByTarget(target) {
  try {
    const request = await axios.get(`${base_url}exercises/target/${target}?${suffix}`)
    return {
      status: 200,
      data: request.data,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching exercise by target`)
    return error;
  }
}

async function getExercisesByName(name) {
  try {
    const request = await axios.get(`${base_url}exercises/name/${name}?${suffix}`)
    return {
      status: 200,
      data: request.data,
      message: 'Success',
    }
  } catch (error) {
    logger.error(`Error in fetching exercise by name`)
    return error
  }
}



module.exports = { getAllExercises, getExerciseById, getBodyPartList, getExerciseByBodyPart, getExerciseByEquipment, getEquipmentList, getTargetList, getExerciseByTarget, getExercisesByName }