const sequelize = require('../config/database');
const express = require('express')
const router = express.Router();
const {Post, User} = require('../models');
const HttpException = require('../middleware/HttpException');


/**
 * @swagger
 * /posts:
 *   post:
 *     summary: 문의사항 게시
 *     requestBody:
 *       description: 문의 사항을 게시하기위한 제목과 내용
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               email:
 *                 type: string
 *                 description: 유저 로그인 여부 확인용
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: 문의사항 성공적으로 게시
 *         content:
 *           application.json:
 *             schema:
 *               properties:
 *                 title:
 *                   type: string
 *                   description: 게시된 게시물 제목
 *                 content:
 *                   type: string
 *                   description: 게시된 게시물 내용
 *                 userId:
 *                   type: Integer
 */

router.post('/', async (req, res, next) => {
	try{
		const {email, title, content} = req.body;
		const user  = await User.findOne({
			where:{email}
		})
		if (!user){
			throw new HttpException(400, "해당하는 이메일은 등록되어 있지 않습니다."); // 오류
			return;
		}

		await sequelize.transaction(async () => {
			const userId = user.id;
			const newPost = await Post.create({
				title,
				content,
				userId
			});
			res.status(201).send(newPost);
		})
	}catch(err){
		next(err);
	}
})

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: 모든 게시물 찾기
 *     responses:
 *       200:
 *         description: 모든 게시물 찾기 성공
 *         application/json:
 *           schema:
 *             title:
 *               type:string
 *             content:
 *               type: string
 *             userId:
 *               type: integer
 */

router.get('/', async (req, res, next) =>{
	try{
		const allPosts  = await Post.findAll({
			order:[["createdAt", "DESC"]]
		});
		res.status(200).send(allPosts);
	}catch(err){
		next(err);
	}
})
module.exports = router;