const db = require("../../models");
const { Op, sequelize } = require("sequelize");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");
const Joi = require("@hapi/joi");
const Sequelize = require("sequelize");
const moment = require("moment");

const Claims = db.claims;
const Providers = db.providers;
const Members = db.members;
const Procedure = db.procedures;
const Diagnoses = db.diagnoses;
const ClaimProviders = db.claimProviders;
const ClaimDiagnoses = db.claimDiagnoses;
const ClaimProcedures = db.claimProcedures;
const PhysicianFlaggedTop = db.physicianFlaggedChargesTopHcpc;
const PhysicianFlaggedCharges = db.physicianFlaggedCharges;

exports.dashboard = async (req, res) => {
	try {
		//Claims Modal
		let claimSubmitStartDate = req.body.submitDate ? req.body.submitDate.start : null;
		let claimSubmitEndDate = req.body.submitDate ? req.body.submitDate.end : null;
		let claimServiceStartDate = req.body.serviceDate ? req.body.serviceDate.start : null;
		let claimServiceEndDate = req.body.serviceDate ? req.body.serviceDate.end : null;
		let serviceType = req.body.serviceType;
		let flaggedReason = req.body.flaggedReason;
		let claimStatus = req.body.claimStatus;
		let chargesFlaggedMin = req.body.chargesFlagged ? req.body.chargesFlagged.min : null;
		let chargesFlaggedMax = req.body.chargesFlagged ? req.body.chargesFlagged.max : null;
		let chargedAmountMin = req.body.chargedAmount ? req.body.chargedAmount.min : null;
		let chargedAmountMax = req.body.chargedAmount ? req.body.chargedAmount.max : null;

		// Members Modal
		let employer = req.body.employer;
		let employerPlan = req.body.employerPlan;

		// Provider Modal
		let state = req.body.state;
		let providerSpecialty = req.body.providerSpecialty;

		let claimWhere = { isActive: "Y" };
		let providerWhere = { isActive: "Y" };
		let memberWhere = { isActive: "Y" };

		let pendingReviewWhere = { claimStatus: "Pending" };
		let reviewedReviewWhere = { claimStatus: "Reviewed" };

		if (claimSubmitStartDate && claimSubmitEndDate) {
			claimWhere.claimSubmitDate = {
				[Op.between]: [claimSubmitStartDate, claimSubmitEndDate]
			};
			pendingReviewWhere.claimSubmitDate = {
				[Op.between]: [claimSubmitStartDate, claimSubmitEndDate]
			};
			reviewedReviewWhere.claimSubmitDate = {
				[Op.between]: [claimSubmitStartDate, claimSubmitEndDate]
			};
		}

		if (claimServiceStartDate && claimServiceEndDate) {
			claimWhere.claimFirstDate = {
				[Op.between]: [claimServiceStartDate, claimServiceEndDate]
			};
			pendingReviewWhere.claimFirstDate = {
				[Op.between]: [claimServiceStartDate, claimServiceEndDate]
			};
			reviewedReviewWhere.claimFirstDate = {
				[Op.between]: [claimServiceStartDate, claimServiceEndDate]
			};
		}

		if (chargesFlaggedMax || chargesFlaggedMin) {
			claimWhere.chargesFlagged = {};

			if (chargesFlaggedMin !== undefined) {
				claimWhere.chargesFlagged[Op.gte] = parseFloat(chargesFlaggedMin);
				pendingReviewWhere.chargesFlagged = claimWhere.chargesFlagged;
				reviewedReviewWhere.chargesFlagged = claimWhere.chargesFlagged;
			}

			if (chargesFlaggedMax !== undefined) {
				claimWhere.chargesFlagged[Op.lte] = parseFloat(chargesFlaggedMax);
				pendingReviewWhere.chargesFlagged = claimWhere.chargesFlagged;
				reviewedReviewWhere.chargesFlagged = claimWhere.chargesFlagged;
			}
		}

		if (chargedAmountMin || chargedAmountMax) {
			claimWhere.chargesTotal = {};

			if (chargedAmountMin !== undefined) {
				claimWhere.chargesTotal[Op.gte] = parseFloat(chargedAmountMin);
				pendingReviewWhere.chargesTotal = claimWhere.chargesTotal;
				reviewedReviewWhere.chargesTotal = claimWhere.chargesTotal;
			}

			if (chargedAmountMax !== undefined) {
				claimWhere.chargesTotal[Op.lte] = parseFloat(chargedAmountMax);
				pendingReviewWhere.chargesTotal = claimWhere.chargesTotal;
				reviewedReviewWhere.chargesTotal = claimWhere.chargesTotal;
			}
		}

		if (claimStatus) {
			claimWhere.claimStatus = claimStatus;
			if (claimStatus == "Pending") {
				reviewedReviewWhere.claimStatus = "null";
			} else if (claimStatus == "Reviewed") {
				pendingReviewWhere.claimStatus = "null";
			}
		}

		if (serviceType) {
			claimWhere.serviceType = serviceType;
			pendingReviewWhere.serviceType = serviceType;
			reviewedReviewWhere.serviceType = serviceType;
		}

		if (flaggedReason) {
			claimWhere.flaggedReason = flaggedReason;
			pendingReviewWhere.flaggedReason = flaggedReason;
			reviewedReviewWhere.flaggedReason = flaggedReason;
		}

		if (employer && employerPlan) {
			memberWhere.memberEmployer = employer;
			memberWhere.memberPlan = employerPlan;
		}

		if (state) {
			providerWhere.providerState = state;
		}

		if (providerSpecialty !== undefined) {
			providerWhere.providerSpecialty = providerSpecialty;
		}

		const totalClaims = await Claims.count({
			where: claimWhere,
			include: [
				{
					model: ClaimProviders,
					attributes: [],
					include: [
						{
							model: Providers,
							where: providerWhere,
							attributes: []
						}
					]
				},
				{
					model: Members,
					attributes: [],
					where: memberWhere
				}
			]
		});
		const totalCharges = await Claims.sum("chargesTotal", {
			where: claimWhere,
			include: [
				{
					model: ClaimProviders,
					attributes: [],
					required: true,

					include: [
						{
							model: Providers,
							where: providerWhere,
							attributes: []
						}
					]
				},
				{
					model: Members,
					attributes: [],
					where: memberWhere
				}
			]
		});

		claimWhere.claimFlagged = "1";
		const totalClaimsFlagged = await Claims.count({
			where: claimWhere,
			include: [
				{
					model: ClaimProviders,
					attributes: [],
					include: [
						{
							model: Providers,
							where: providerWhere,
							attributes: []
						}
					]
				},
				{
					model: Members,
					attributes: [],
					where: memberWhere
				}
			]
		});
		const totalChargesFlagged = await Claims.sum("chargesFlagged", {
			where: claimWhere,
			include: [
				{
					model: ClaimProviders,
					attributes: [],
					required: true,

					include: [
						{
							model: Providers,
							where: providerWhere,
							attributes: []
						}
					]
				},
				{
					model: Members,
					attributes: [],
					where: memberWhere
				}
			]
		});

		const pendingReview = await Claims.findAll({
			include: [
				{
					model: ClaimProviders,
					required: true,
					attributes: [],

					include: [
						{
							model: Providers,
							attributes: [],
							where: providerWhere
						}
					]
				},
				{
					model: Members,
					attributes: [],
					where: memberWhere
				}
			],
			attributes: [
				[Sequelize.fn("COUNT", Sequelize.col("*")), "claimCount"],

				[Sequelize.literal("SUM(chargesTotal)"), "totalCharges"]
			],
			where: pendingReviewWhere
		});

		const reviewedReview = await Claims.findAll({
			include: [
				{
					model: ClaimProviders,
					attributes: [],
					required: true,

					include: [
						{
							model: Providers,
							attributes: [],

							where: providerWhere
						}
					]
				},
				{
					model: Members,
					attributes: [],

					where: memberWhere
				}
			],
			attributes: [
				[Sequelize.fn("COUNT", Sequelize.col("*")), "claimCount"],

				[Sequelize.literal("SUM(chargesTotal)"), "totalCharges"]
			],
			where: reviewedReviewWhere
		});

		const topServiceTypes = await Claims.findAll({
			include: [
				{
					model: ClaimProviders,
					attributes: [],
					include: [
						{
							model: Providers,
							attributes: [],
							where: providerWhere
						}
					]
				},
				{
					model: Members,
					attributes: [],
					where: memberWhere
				}
			],
			where: claimWhere,
			attributes: ["serviceType", [Sequelize.literal("SUM(chargesFlagged)"), "totalCost"]],
			group: ["serviceType"],
			order: [[Sequelize.literal("totalCost DESC")]],
			limit: 5
		});

		// 		const topStates = await db.sequelize.query(`
		// 		SELECT
		//     p.providerState,
		//     SUM(c.chargesTotal) AS chargesTotal
		// FROM
		//     providers p
		// JOIN
		//     claimProviders cp ON p.providerId = cp.providerId
		// JOIN
		//     claims c ON cp.claimId = c.claimId
		// GROUP BY
		//     p.providerState
		// ORDER BY
		// chargesTotal DESC
		// LIMIT 5;
		// 		`);

		const topStates = await Claims.findAll({
			include: [
				{
					model: ClaimProviders,
					attributes: ["id"],
					include: [
						{
							model: Providers,
							attributes: ["id", "providerState"],
							where: providerWhere
						}
					]
				},
				{
					model: Members,
					attributes: [],
					where: memberWhere
				}
			],
			where: claimWhere,
			attributes: ["id", "chargesTotal", "chargesFlagged"]
		});

		let top = topsStates(topStates);

		const claimsCharts = await Claims.findAll({
			include: [
				{
					model: ClaimProviders,
					attributes: [],
					required: true,
					include: [
						{
							model: Providers,
							attributes: [],

							where: providerWhere
						}
					]
				},
				{
					model: Members,
					attributes: [],

					where: memberWhere
				}
			],
			where: claimWhere,
			attributes: ["claimSubmitDate", "chargesTotal", "chargesFlagged"],
			order: [[Sequelize.literal("claimSubmitDate"), "ASC"]]
		});

		let week = claimsGroupDataByWeek(claimsCharts);

		let totalFlaggedCharges = 0;
		let chargesArray = [];
		let allCharges = 0;
		let allClaims = 0;

		week.forEach((e, index) => {
			let count = 0;
			e.claims.forEach((claim) => {
				totalFlaggedCharges = parseInt(claim.chargesFlagged) + totalFlaggedCharges;
				count++;
			});
			let obj = {
				week: index + 1,
				weekStartDate: e.weekStartDate,
				weekEndDate: e.weekEndDate,
				weekFlaggedCharges: totalFlaggedCharges,
				weekClaims: count
			};
			chargesArray.push(obj);
			totalFlaggedCharges = 0;
			count = 0;
		});

		chargesArray.forEach((e) => {
			allCharges = e.weekFlaggedCharges + allCharges;
			allClaims = e.weekClaims + allClaims;
		});

		chargesArray.forEach((e) => {
			let percentage = e.weekFlaggedCharges / allCharges;
			let claimPercentage = e.weekClaims / allClaims;
			e.weekPercentage = percentage;
			e.weekClaimPercentage = claimPercentage;
		});

		res.send({
			stat: {
				claims: {
					total: totalClaims,
					flagged: totalClaimsFlagged
				},
				charges: {
					total: totalCharges,
					flagged: totalChargesFlagged
				},
				reviewed: {
					pending: pendingReview,
					done: reviewedReview
				}
			},
			claimsCharts: chargesArray,
			topStates: top,
			topServiceTypes: topServiceTypes
		});
	} catch (err) {
		console.log(err);
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.claimsList = async (req, res) => {
	try {
		let firstIndex = req.body.firstIndex;
		let lastIndex = req.body.lastIndex;
		let columnName = req.body.columnName ? req.body.columnName : "id";
		let sortingOrder = req.body.sortingOrder ? req.body.sortingOrder : "ASC";

		//Claims Modal
		let claimSubmitStartDate = req.body.submitDate ? req.body.submitDate.start : null;
		let claimSubmitEndDate = req.body.submitDate ? req.body.submitDate.end : null;
		let claimServiceStartDate = req.body.serviceDate ? req.body.serviceDate.start : null;
		let claimServiceEndDate = req.body.serviceDate ? req.body.serviceDate.end : null;
		let serviceType = req.body.serviceType;
		let flaggedReason = req.body.flaggedReason;
		let claimStatus = req.body.claimStatus;
		let chargesFlaggedMin = req.body.chargesFlagged ? req.body.chargesFlagged.min : null;
		let chargesFlaggedMax = req.body.chargesFlagged ? req.body.chargesFlagged.max : null;
		let chargedAmountMin = req.body.chargedAmount ? req.body.chargedAmount.min : null;
		let chargedAmountMax = req.body.chargedAmount ? req.body.chargedAmount.max : null;

		// Members Modal
		let employer = req.body.employer;
		let employerPlan = req.body.employerPlan;

		// Provider Modal
		let state = req.body.state;
		let providerSpecialty = req.body.providerSpecialty;

		let claimWhere = { isActive: "Y" };
		let providerWhere = { isActive: "Y" };
		let memberWhere = { isActive: "Y" };

		if (claimSubmitStartDate && claimSubmitEndDate) {
			claimWhere.claimSubmitDate = {
				[Op.between]: [claimSubmitStartDate, claimSubmitEndDate]
			};
		}

		if (claimServiceStartDate && claimServiceEndDate) {
			claimWhere.claimFirstDate = {
				[Op.between]: [claimServiceStartDate, claimServiceEndDate]
			};
		}

		if (chargesFlaggedMax || chargesFlaggedMin) {
			claimWhere.chargesFlagged = {};

			if (chargesFlaggedMin !== undefined) {
				claimWhere.chargesFlagged[Op.gte] = parseFloat(chargesFlaggedMin);
			}

			if (chargesFlaggedMax !== undefined) {
				claimWhere.chargesFlagged[Op.lte] = parseFloat(chargesFlaggedMax);
			}
		}

		if (chargedAmountMin || chargedAmountMax) {
			claimWhere.chargesTotal = {};

			if (chargedAmountMin !== undefined) {
				claimWhere.chargesTotal[Op.gte] = parseFloat(chargedAmountMin);
			}

			if (chargedAmountMax !== undefined) {
				claimWhere.chargesTotal[Op.lte] = parseFloat(chargedAmountMax);
			}
		}

		if (claimStatus) {
			claimWhere.claimStatus = claimStatus;
		}

		if (serviceType) {
			claimWhere.serviceType = serviceType;
		}

		if (flaggedReason) {
			claimWhere.flaggedReason = flaggedReason;
		}

		if (employer && employerPlan) {
			memberWhere.memberEmployer = employer;
			memberWhere.memberPlan = employerPlan;
		}

		if (state) {
			providerWhere.providerState = state;
		}

		if (providerSpecialty !== undefined) {
			providerWhere.providerSpecialty = providerSpecialty;
		}

		// let count = await Claims.count({
		// 	where: claimWhere,
		// 	required: true,
		// 	include: [
		// 		{
		// 			model: Members,
		// 			where: memberWhere,
		// 			required: true,
		// 			attributes: ["id", "memberId", "memberName", "memberDOB", "memberEmployer", "memberPlan"]
		// 		},
		// 		{
		// 			model: ClaimProcedures,
		// 			attributes: ["id"],
		// 			include: [
		// 				{
		// 					model: Procedure,
		// 					attributes: ["code", "description"]
		// 				}
		// 			]
		// 		}
		// 	]
		// });

		let list = await Claims.findAndCountAll({
			where: claimWhere,
			required: true,
			distinct: true,
			include: [
				{
					model: Members,
					where: memberWhere,
					required: true,
					attributes: ["id", "memberId", "memberName", "memberDOB", "memberEmployer", "memberPlan"]
				},
				{
					model: ClaimProcedures,
					attributes: ["id"],
					include: [
						{
							model: Procedure,
							attributes: ["code", "description"]
						}
					]
				},
				{
					model: ClaimProviders,
					attributes: ["id"],
					required: false,
					include: [
						{
							model: Providers,
							where: providerWhere,
							required: true,
							include: [
								{
									model: PhysicianFlaggedTop,
									attributes: { exclude: ["id", "createdAt", "updatedAt"] }
								},
								{
									model: PhysicianFlaggedCharges,
									attributes: { exclude: ["id", "createdAt", "updatedAt"] }
								}
							],
							attributes: ["id", "providerState", "providerSpecialty"]
						}
					]
				},
				{
					model: ClaimDiagnoses,
					attributes: ["id"],
					include: [
						{
							model: Diagnoses,
							attributes: ["code", "description"],
							where: { isActive: "Y" }
						}
					]
				}
			],
			attributes: [
				"id",
				"claimId",
				"claimSubmitDate",
				"claimFirstDate",
				"flaggedReason",
				"chargesFlagged",
				"chargesTotal",
				"claimStatus"
			],
			order: [[columnName, sortingOrder]],
			offset: firstIndex,
			limit: lastIndex
		});

		res.send({ count: list.rows.length, data: list });
	} catch (err) {
		console.log(err);
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.states = async (req, res) => {
	try {
		Providers.findAll({
			attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("providerState")), "state"]]
		})
			.then((response) => {
				const fullStateNamesArray = response.map((item) => ({
					state: getFullStateName(item.dataValues.state)
				}));
				res.send({ data: fullStateNamesArray });
			})
			.catch((err) => {
				res.status(500).send({
					message: err.message || "Some error occurred."
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.employeer = async (req, res) => {
	try {
		const memberPlan = await Members.findAll({
			attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("memberPlan")), "memberPlan"]]
		});

		const memberEmployer = await Members.findAll({
			attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("memberEmployer")), "memberEmployer"]]
		});
		res.send({ memberPlan: memberPlan, memberEmployer: memberEmployer });
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.serviceTypes = async (req, res) => {
	try {
		Claims.findAll({
			attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("serviceType")), "serviceTypes"]]
		})
			.then((response) => {
				res.send({ data: response });
			})
			.catch((err) => {
				res.status(500).send({
					message: err.message || "Some error occurred."
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.providerSpeciality = async (req, res) => {
	try {
		Providers.findAll({
			attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("providerSpecialty")), "specialty"]]
		})
			.then((response) => {
				res.send({ data: response });
			})
			.catch((err) => {
				res.status(500).send({
					message: err.message || "Some error occurred."
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.flaggedReason = async (req, res) => {
	try {
		Claims.findAll({
			attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("flaggedReason")), "flaggedReason"]]
		})
			.then((response) => {
				res.send({ data: response });
			})
			.catch((err) => {
				res.status(500).send({
					message: err.message || "Some error occurred."
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

let claimsGroupDataByWeek = (data) => {
	return data.reduce((acc, item) => {
		// Parse the claimSubmitDate using Moment.js
		const submitDate = moment(item.claimSubmitDate, "YYYY/MM/DD");
		// console.log(submitDate);
		// Get the start and end dates of the week using Moment.js
		const weekStartDate = submitDate.clone().startOf("week");
		const weekEndDate = submitDate.clone().endOf("week");

		// Format the dates as needed
		const formattedStartDate = weekStartDate.format("YYYY/MM/DD");
		const formattedEndDate = weekEndDate.format("YYYY/MM/DD");

		// Check if there's already a week entry in the accumulator
		const existingWeek = acc.find(
			(group) => group.weekStartDate === formattedStartDate && group.weekEndDate === formattedEndDate
		);

		if (existingWeek) {
			// If the week entry exists, push the current item to its claims array
			existingWeek.claims.push(item);
		} else {
			// If the week entry doesn't exist, create a new entry
			acc.push({
				weekStartDate: formattedStartDate,
				weekEndDate: formattedEndDate,
				claims: [item]
			});
		}

		return acc;
	}, []);
};

let topsStates = (data) => {
	const stateCharges = {};
	data.forEach((claim) => {
		const state = claim.claimProviders[0].provider.providerState;
		const chargesTotal = JSON.parse(claim.chargesTotal);
		// console.log(state, "state");
		// console.log(chargesTotal, "chargesTotal");

		if (state && chargesTotal) {
			stateCharges[state] = (stateCharges[state] || 0) + chargesTotal;
		}
	});

	// Sort states by total charges in descending order
	const sortedStates = Object.entries(stateCharges).sort((a, b) => b[1] - a[1]);

	// Take the top 5 states
	const top5States = sortedStates.slice(0, 5);

	return top5States;
};
