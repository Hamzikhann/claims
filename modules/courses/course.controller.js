const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");

const Classes = db.classes;
const Courses = db.courses;

const courseBooks = db.courseBooks;
const courseDepartment = db.courseDepartments;
const courseEnrollment = db.courseEnrollments;
const courseFaqs = db.courseFaqs;
const courseInstructor = db.courseInstructors;
const courseObjective = db.courseObjectives;
const courseUsefulLinks = db.courseUsefulLinks;
const courseSyllabus = db.courseSyllabus;
const courseModule = db.courseModules;
const Joi = require("@hapi/joi");
const courseModules = require("../../models/courseModules");

exports.create = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			title: Joi.string().required(),
			about: Joi.string().required(),
			code: Joi.string().required(),
			level: Joi.string().required(),
			language: Joi.string().required(),
			classId: Joi.number().required(),
			courseDepartmentId: Joi.number().required()
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const classObj = {
				title: req.body.title.trim(),
				about: req.body.about,
				code: req.body.code,
				level: req.body.level,
				language: req.body.language,
				classId: req.body.classId,
				courseDepartmentId: req.body.courseDepartmentId
			};

			const alreadyExist = await Classes.findOne({
				where: {
					title: classObj.title.trim()
				},
				attributes: ["id"]
			});
			if (alreadyExist) {
				res.status(405).send({
					title: "Already exist.",
					message: "Course is already exist."
				});
			} else {
				Courses.create(classObj)
					.then(async (result) => {
						res.status(200).send({
							message: "Course created successfully.",
							data: result
						});
					})
					.catch(async (err) => {
						// emails.errorEmail(req, err);
						res.status(500).send({
							message: err.message || "Some error occurred while creating the Quiz."
						});
					});
			}
		}
	} catch (err) {
		// emails.errorEmail(req, err);

		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

// Retrieve all Classes.
exports.findAllCourses = (req, res) => {
	try {
		Courses.findAll({
			where: { isActive: "Y" },
			include: [
				{
					model: courseDepartment,
					where: { isActive: "Y" },
					required: false,
					attributes: ["id", "title", "isActive"]
				},

				{
					model: courseInstructor,
					where: { isActive: "Y" },
					required: false,
					attributes: ["id", "name", "isActive"]
				}
			],
			attributes: { exclude: ["createdAt", "updatedAt"] }
		})
			.then((data) => {
				// encryptHelper(data);
				res.send(data);
			})
			.catch((err) => {
				// emails.errorEmail(req, err);
				res.status(500).send({
					message: err.message || "Some error occurred while retrieving Classes."
				});
			});
	} catch (err) {
		// emails.errorEmail(req, err);

		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

// Retrieve all Classes with courses.
// exports.findClasseswithCourses = (req, res) => {
// 	try {
// 		Classes.findAll({
// 			where: { isActive: "Y" },
// 			include: {
// 				model: Courses,
// 				where: { isActive: "Y" },
// 				attributes: ["id", "title"]
// 			},
// 			attributes: { exclude: ["createdAt", "updatedAt"] }
// 		})
// 			.then((data) => {
// 				encryptHelper(data);
// 				res.send(data);
// 			})
// 			.catch((err) => {
// 				emails.errorEmail(req, err);
// 				res.status(500).send({
// 					message: err.message || "Some error occurred while retrieving Classes."
// 				});
// 			});
// 	} catch (err) {
// 		emails.errorEmail(req, err);

// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// Retrieve Class by Id.
exports.findCourseById = (req, res) => {
	try {
		Courses.findOne({
			where: { id: req.body.courseId, isActive: "Y" },
			include: [
				{
					model: courseBooks,
					where: { isActive: "Y" },
					required: false,
					attributes: ["id", "title", "isActive"]
				},
				{
					model: courseDepartment,
					where: { isActive: "Y" },
					required: false,
					attributes: ["id", "title", "isActive"]
				},
				{
					model: courseEnrollment,
					where: { isActive: "Y" },
					required: false,
					attributes: ["id", "progress", "isActive"]
				},
				{
					model: courseFaqs,
					where: { isActive: "Y" },
					required: false,
					attributes: ["id", "title", "isActive"]
				},
				{
					model: courseInstructor,
					where: { isActive: "Y" },
					required: false,
					attributes: ["id", "name", "isActive"]
				},
				{
					model: courseObjective,
					where: { isActive: "Y" },
					required: false,
					attributes: ["id", "description", "isActive"]
				},
				{
					model: courseUsefulLinks,
					where: { isActive: "Y" },
					required: false,
					attributes: ["id", "title", "isActive"]
				},
				{
					model: courseSyllabus,
					where: { isActive: "Y" },
					include: [
						{
							model: courseModule,
							where: { isActive: "Y" },
							required: false,
							attributes: ["id", "title", "isActive"]
						}
					],
					required: false,
					attributes: ["id", "title", "isActive"]
				}
			],
			attributes: { exclude: ["isActive"] }
		})
			.then((data) => {
				// encryptHelper(data);
				res.send(data);
			})
			.catch((err) => {
				// emails.errorEmail(req, err);
				res.status(500).send({
					message: err.message || "Some error occurred while retrieving Classes."
				});
			});
	} catch (err) {
		// emails.errorEmail(req, err);

		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

// Update a Class by the id in the request
exports.update = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			title: Joi.string().required(),
			about: Joi.string().required(),
			code: Joi.string().required(),
			level: Joi.string().required(),
			language: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			emails.errorEmail(req, error);
			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const courseId = crypto.decrypt(req.params.courseId);
			const userId = crypto.decrypt(req.userId);

			const alreadyExist = await Classes.findOne({
				where: {
					title: req.body.title.trim()
				},
				attributes: ["id"]
			});
			if (alreadyExist) {
				res.status(405).send({
					title: "Already exist.",
					message: "Class is already exist with same name."
				});
			} else {
				Classes.update(
					{
						title: req.body.title.trim(),
						about: req.body.about,
						code: req.body.code,
						level: req.body.level,
						language: req.body.language
					},
					{
						where: { id: courseId, isActive: "Y", createdBy: userId }
					}
				)
					.then((num) => {
						if (num == 1) {
							res.send({
								message: "Course was updated successfully."
							});
						} else {
							res.send({
								message: `Cannot update Course. Maybe Course was not found or req.body is empty!`
							});
						}
					})
					.catch((err) => {
						emails.errorEmail(req, err);
						res.status(500).send({
							message: "Error updating Class"
						});
					});
			}
		}
	} catch (err) {
		emails.errorEmail(req, err);

		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

// Delete a Class with the specified id in the request
exports.delete = (req, res) => {
	try {
		const courseId = crypto.decrypt(req.params.courseId);
		const userId = crypto.decrypt(req.userId);

		Classes.update(
			{ isActive: "N" },
			{
				where: { id: courseId }
			}
		)
			.then(async (num) => {
				if (num == 1) {
					res.send({
						message: "Course was deleted successfully."
					});
				} else {
					res.send({
						message: `Cannot delete Course. Maybe Course was not found!`
					});
				}
			})
			.catch((err) => {
				emails.errorEmail(req, err);
				res.status(500).send({
					message: "Error deleting Course"
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);

		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

// Retrieve all Classes with courses.
// exports.findClasseswithCoursesForTeacher = (req, res) => {
// 	try {
// 		Classes.findAll({
// 			where: { isActive: "Y" },
// 			include: {
// 				model: Courses,
// 				where: { isActive: "Y" },
// 				include: [{ model: Teaches, where: { isActive: "Y", userId: crypto.decrypt(req.userId) } }],
// 				attributes: ["id", "title"]
// 			},
// 			attributes: { exclude: ["createdAt", "updatedAt"] }
// 		})
// 			.then((data) => {
// 				encryptHelper(data);
// 				res.send(data);
// 			})
// 			.catch((err) => {
// 				emails.errorEmail(req, err);
// 				res.status(500).send({
// 					message: err.message || "Some error occurred while retrieving Classes."
// 				});
// 			});
// 	} catch (err) {
// 		emails.errorEmail(req, err);

// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };
// Retrieve all Classes For Teacher.
// exports.findAllForTeacher = (req, res) => {
// 	try {
// 		// console.log(crypto.decrypt(req.userId));
// 		Classes.findAll({
// 			where: { isActive: "Y" },
// 			include: [
// 				{
// 					model: Courses,
// 					where: { isActive: "Y" },
// 					include: [{ model: Teaches, where: { isActive: "Y", userId: crypto.decrypt(req.userId) } }]
// 				}
// 			],
// 			attributes: { exclude: ["createdAt", "updatedAt"] }
// 		})
// 			.then((data) => {
// 				// console.log(data);
// 				encryptHelper(data);
// 				res.send(data);
// 			})
// 			.catch((err) => {
// 				emails.errorEmail(req, err);
// 				res.status(500).send({
// 					message: err.message || "Some error occurred while retrieving Classes."
// 				});
// 			});
// 	} catch (err) {
// 		emails.errorEmail(req, err);

// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };
