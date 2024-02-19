"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"claims",
		{
			claimId: DataTypes.STRING,
			claimStatus: DataTypes.STRING,
			claimFirstDate: DataTypes.STRING,
			claimLastDate: DataTypes.STRING,
			claimSubmitDate: DataTypes.STRING,
			chargesFlagged: DataTypes.STRING,
			chargesTotal: DataTypes.STRING,
			flaggedReason: DataTypes.STRING,
			serviceType: DataTypes.STRING,
			medicalRecordReviewRecommendation: DataTypes.STRING,
			medicalRecordReviewNotes: DataTypes.STRING,
			billingOrganization: DataTypes.STRING,
			billingID: DataTypes.STRING,
			claimFlagged: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: 0
			},
			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},

		{ timestamps: true }
	);
	table.associate = function (models) {
		table.belongsTo(models.members);
		table.hasMany(models.claimDiagnoses);
		table.hasMany(models.claimProviders);
		table.hasMany(models.claimProcedures);
	};
	return table;
};

// {
//   "claimId": 887253385863058,
//   "claimFirstDate": "2023-10-29",
//   "claimLastDate": "2023-10-29",
//   "claimType": "Professional",
//   "claimSubmitDate": "2023-11-12",
//   "member": {
//     "memberId": "00016F745862898F",
//     "memberName": "Jesse Roth",
//     "memberDOB": "1957-01-01",
//     "memberSex": "Male",
//     "memberEmployer": "Employer C",
//     "memberPlan": "HSA"
//   },
//   "claimFlagged": 1,
//   "serviceType": "Inpatient Hospital Evaluation & Management Visits",
//   "claimStatus": "Pending",
//   "medicalRecordReviewRecommendation": "",
//   "medicalRecordReviewNotes": "",
//   "flaggedReason": "Billing level inconsistent with clinical complexity",
//   "chargesFlagged": 1362.8,
//   "chargesTotal": 1362.8,
//   "flaggedProcedureCodes": [
//     {
//       "service_line_identifier": 1,
//       "code": 99223,
//       "description": "Initial hospital care, per day, for the evaluation and management of a patient",
//       "amountCharged": 1362.8
//     }
//   ],
//   "billingID": "Riverrock Medical",
//   "billingID": 1802093890,
//   "providers": [
//     {
//       "providerId": 7188395348,
//       "providerName": "Mrs. Joy Duffy DVM MD",
//       "providerType": "Servicing Provider",
//       "providerState": "OR",
//       "providerSpecialty": "Internist endocrine",
//       "providerEmail": "contact@riverrockmedical.org"
//     }
//   ],
//   "diagnoses": [
//     {
//       "code": "K5652",
//       "description": "Intestinal adhesions [bands] with complete obstruction"
//     }
//   ]
// }
