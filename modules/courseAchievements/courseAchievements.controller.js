const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");
const Joi = require("@hapi/joi");
const { sequelize } = require("../../models");

const CourseAchievements = db.courseAchievements;
const CourseEnrollments = db.courseEnrollments;
const CourseAssignments = db.courseAssignments;

exports.listByUser = (req, res) => {
	try {
		const userId = crypto.decrypt(req.userId);
		const clientId = crypto.decrypt(req.clientId);

		CourseAchievements.findAll({
			where: { isActive: "Y" },
			include: [
				{
					model: CourseEnrollments,
					where: { userId, isActive: "Y" },
					include: [
						{
							model: CourseAssignments,
							where: { clientId, isActive: "Y" },
							attributes: []
						}
					],
					attributes: []
				}
			],
			order: [["id", "DESC"]],
			attributes: ["id", "createdAt", "courseEnrollmentId"]
		})
			.then((response) => {
				encryptHelper(response);
				res.send({ data: response });
			})
			.catch((err) => {
				emails.errorEmail(req, err);
				res.status(500).send({
					message: err.message || "Some error occurred while creating the Quiz."
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while creating the Quiz."
		});
	}
};

exports.listByCourse = (req, res) => {
	try {
		const joiSchema = Joi.object({
			courseId: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const courseId = crypto.decrypt(req.body.courseId);
			const clientId = crypto.decrypt(req.clientId);
			const userId = crypto.decrypt(req.userId);

			CourseAchievements.findAll({
				where: { isActive: "Y" },
				include: [
					{
						model: CourseEnrollments,
						where: { userId, isActive: "Y" },
						include: [
							{
								model: CourseAssignments,
								where: { courseId, clientId, isActive: "Y" },
								attributes: []
							}
						],
						attributes: []
					}
				],
				order: [["id", "DESC"]],
				attributes: ["id", "createdAt", "courseEnrollmentId"]
			})
				.then((response) => {
					encryptHelper(response);
					res.send({ data: response });
				})
				.catch((err) => {
					emails.errorEmail(req, err);
					res.status(500).send({
						message: err.message || "Some error occurred while creating the Quiz."
					});
				});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while creating the Quiz."
		});
	}
};