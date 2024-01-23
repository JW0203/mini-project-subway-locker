const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');

const { User, Locker } = require('../models');
const HttpException = require('../middleware/HttpException');
const checkRequiredParameters = require('../functions/checkRequiredParameters');

/**
 * @swagger
 * /users:
 *   get:
 *     summary: 모든 유저 정보 조회
 *     description: 모든 유저의 pk 값과 이메일 정보를 조회
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    id:
 *                      type: number
 *                    email:
 *                      type: string
 *                      format: email
 *                    createdAt:
 *                      type: string
 *                      format: date-time
 *
 */

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.user;
    const result = checkRequiredParameters([id]);
    if (result.validation === false) {
      throw new HttpException(result.statusCode, result.message);
      return;
    }

    if (!Number(id)) {
      throw new HttpException(400, 'user 의 id 가 숫자가 아닙니다.');
      return;
    }
    const foundUser = await User.findOne({
      where: { id },
      attributes: ['id', 'email', 'createdAt'],
    });
    res.status(200).send(foundUser);
  } catch (err) {
    next();
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: 유저 아이디로 유저 정보 및 사용 중인 사물함 정보 조회
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               properties:
 *                 id:
 *                   type: number
 *                 email:
 *                   type: string
 *                   format: email
 *                 locker:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                         default: "occupied"
 *                       stationId:
 *                         type: number
 *                       userId:
 *                         type: number
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = checkRequiredParameters([id]);
    if (result.validation === false) {
      throw new HttpException(result.statusCode, result.message);
      return;
    }

    if (!Number(id)) {
      throw new HttpException(400, 'user 의 id 는 숫자를 입력해주세요.');
      return;
    }
    const user = await User.findOne({
      where: { id },
      attributes: ['id', 'email'],
    });
    console.log(user);
    const userLocker = await Locker.findAll({
      where: { userId: id },
      attributes: ['id', 'startDate', 'status', 'stationId', 'userId'],
    });

    if (!user) {
      throw new HttpException(400, '없는 유저 입니다.');
      return;
    }

    let userLockerInfo = [];
    if (userLocker) {
      for (let i = 0; i < userLocker.length; i++) {
        userLockerInfo.push(userLocker[i].dataValues);
      }
      user.dataValues.locker = userLockerInfo;
    }
    res.status(200).send(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
