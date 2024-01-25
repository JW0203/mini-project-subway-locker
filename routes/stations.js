require('dotenv').config();
const { Station, Locker, Comment } = require('../models');
const express = require('express');
const router = express.Router();
const HttpException = require('../middleware/HttpException');
const { authenticateToken, authorityConfirmation } = require('../middleware');
const { checkWeather } = require('../functions');
const { UserAuthority } = require('../models/enums');

/**
 * @swagger
 * /stations:
 *   post:
 *     summary: 역 추가
 *
 *     requestBody:
 *       description: 역 추가를 위한 이름, 좌표 값 필요, array 형식으로 입력 가능
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "서울역"
 *                 latitude:
 *                   type: number
 *                   format: float
 *                   example: 37.528
 *                 longitude:
 *                   type: number
 *                   format: float
 *                   example: 126.9294
 *     responses:
 *       201:
 *         description: 역 추가 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 name:
 *                   type: string
 *                   example: "서울역"
 *                 latitude:
 *                   type: number
 *                   format: float
 *                   example: 37.5283169
 *                 longitude:
 *                   type: number
 *                   format: float
 *                   example: 126.9294254
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 */
router.post('/', authenticateToken, authorityConfirmation(UserAuthority.ADMIN), async (req, res, next) => {
  try {
    const { data } = req.body;
    const newStations = [];
    const requiredKeys = ['name', 'latitude', 'longitude'];

    if (!data) {
      throw new HttpException(400, '역을 추가하기 위한 데이터(역명, 경도, 위도) 를 입력해주세요.');
      return;
    }

    for (let n in data) {
      const item = data[n];
      if (Object.keys(item).length === 0) {
        throw new HttpException(400, '입력한 데이터가 비어 있습니다.');
        return;
      }
      if (typeof item !== 'object' || item === null) {
        throw new HttpException(400, '입력한 데이터의 속성은 objects 이여야 합니다.');
        return;
      }

      const itemKeys = Object.keys(item);
      if (!requiredKeys.every((key) => itemKeys.includes(key)) || itemKeys.length !== requiredKeys.length) {
        throw new HttpException(400, 'data의 key 값이 잘 못되었습니다.');
        return;
      }

      const { name, latitude, longitude } = data[n];
      if (typeof name != 'string') {
        throw new HttpException(400, 'name은 문자로 입력해주세요.');
        return;
      }
      if (typeof latitude != 'number') {
        throw new HttpException(400, 'latitude 는 숫자로 입력해주세요.');
      }
      if (!(-90 < latitude && 90 > latitude)) {
        throw new HttpException(400, 'latitude 는 -90 에서 90 사이의 값을 입력해주세요.');
        return;
      }
      if (typeof longitude != 'number') {
        throw new HttpException(400, 'longitude 는 숫자로 입력해주세요.');
      }
      if (!(-180 < longitude && 180 > longitude)) {
        throw new HttpException(400, 'longitude 는 -180 에서 180 사이의 값을 입력해주세요.');
        return;
      }

      const stationDuplication = await Station.findOne({
        where: { name },
      });

      if (stationDuplication) {
        throw new HttpException(400, `${name} 은 이미 저장되어 있습니다.`);
        return;
      }

      const station = await Station.create({
        name,
        latitude,
        longitude,
      });
      newStations.push(station);
    }
    res.status(201).send(newStations);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /stations:
 *   get:
 *     summary: 모든 역 찾기
 *     responses:
 *       200:
 *         description: 모든 역 찾기 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   name:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                     format: float
 *                   longitude:
 *                     type: number
 *                     format: float
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 */
router.get('/', async (req, res, next) => {
  try {
    const allStations = await Station.findAll();
    res.status(200).send(allStations);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /stations/{id}:
 *   get:
 *     summary: 역 아이디로 해당 역 정보 찾기, 로그인 인증 필수, 토큰은 local storage 에 저장 되어 있는 것을 이용
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: 역 위치와 해당 역에 있는 사물함 찾기 성공
 *         content:
 *           application/json:
 *             schema:
 *               properties:
 *                 id:
 *                   type: number
 *                 name:
 *                   type: string
 *                 latitude:
 *                   type: number
 *                   format: float
 *                 longitude:
 *                   type: number
 *                   format: float
 *                 temperature:
 *                   type: number
 *                   format: float
 *                 humidity:
 *                   type: number
 *                   format: float
 *                 lockers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                         default: "unoccupied"
 *                       userId:
 *                         type: number
 *                       stationID:
 *                         type: number
 *
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!id) {
      throw new HttpException(400, 'id 값을 입력해주세요.');
      return;
    }

    if (!Number.isInteger(id)) {
      throw new HttpException(400, 'id 값은 숫자로 입력해주세요');
      return;
    }

    const station = await Station.findOne({
      where: { id },
      attributes: { exclude: ['updatedAt', 'createdAt'] },
    });

    if (!station) {
      throw new HttpException(400, '해당하는 역은 없습니다.');
      return;
    }

    const weatherData = await checkWeather(station);
    const lockers = await Locker.findAll({
      where: { stationId: id },
      attributes: { exclude: ['updatedAt', 'createdAt'] },
    });

    const lockerInfo = [];
    for (let i = 0; i < lockers.length; i++) {
      lockerInfo.push(lockers[i].dataValues);
    }
    const stationMetaData = {
      station: station.dataValues,
      lockerInfo,
      temperature: weatherData.main.temp,
      humidity: weatherData.main.humidity,
    };
    res.status(200).send(stationMetaData);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /stations/{id}:
 *   delete:
 *     summary: 역관련 정보 삭제
 *     description : 입력된 역이름을 이용하여 해당 역과 해당 역과 연결된 라커도 같이 다 제거
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: ture
 *     responses:
 *       204:
 *         description : 역 삭제 성공
 *
 */
router.delete('/:id', authenticateToken, authorityConfirmation(UserAuthority.ADMIN), async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!id) {
      throw new HttpException(400, 'id 값을 입력해주세요.');
      return;
    }
    const station = await Station.findOne({
      where: { id },
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    });
    if (!station) {
      throw new HttpException(400, '없는 역이름 입니다.');
      return;
    }
    await Locker.destroy({ where: { stationId: station.id } });
    await Station.destroy({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /stations/restore/{id}:
 *   patch:
 *     summary: 지운 station 과 연결된 lockers복구
 *     description: 관리자 권한필요, 지워진 station id 를 이용하여 station 과 연결된 locker 복구
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: number
 *         required: true
 *         description: 삭제된 station id
 *     responses:
 *       201:
 *         description: 삭제된 station locker 성공적으로 복구
 *         content:
 *           application.json:
 *             schema:
 *               properties:
 *                 station:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     name:
 *                       type: string
 *                     latitude:
 *                       type: number
 *                       format: float
 *                     longitude:
 *                       type: number
 *                       format: float
 *                     deletedAt:
 *                       type: string
 *                       default : null
 *                 lockers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                         default: "unoccupied"
 *                       userId:
 *                         type: number
 *                       stationID:
 *                         type: number
 *                       deletedAt:
 *                         type: string
 *                         default: null
 *
 */
router.patch('/restore/:id', authenticateToken, authorityConfirmation(UserAuthority.ADMIN), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = checkRequiredParameters([id]);
    if (result.validation === false) {
      throw new HttpException(400, '복구할 station 의 id 를 입력해주세요.');
      return;
    }
    if (!Number.isInteger(id)) {
      throw new HttpException(400, '복구할 station 의  id 는 숫자로 입력해주세요.');
      return;
    }
    const station = await Station.findOne({ where: { id } });
    if (station) {
      throw new HttpException(400, '삭제된 station 이 아닙니다.');
      return;
    }

    await Station.restore({ where: { id } });
    await Locker.restore({ where: { stationId: id } });

    const restoredStation = await Station.findOne({
      where: { id },
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    });
    const restoredLockers = await Locker.findAll({
      where: { stationId: id },
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    });
    const restoredStationLockers = {
      station: restoredStation,
      lockers: restoredLockers,
    };
    res.status(200).send(restoredStationLockers);
  } catch (err) {
    next(err);
  }
});
module.exports = router;
