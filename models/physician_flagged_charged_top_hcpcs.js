"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"physicianFlaggedChargesTopHcpc",
		{
			claimSubmissionYear: DataTypes.STRING,
			top1Hcpcs: DataTypes.STRING,
			top1HcpcsDescription: DataTypes.STRING,
			top1FlaggedAmt: DataTypes.STRING,
			top2Hcpcs: DataTypes.STRING,
			top2HcpcsDescription: DataTypes.STRING,
			top2FlaggedAmt: DataTypes.STRING,
			top3Hcpcs: DataTypes.STRING,
			top3HcpcsDescription: DataTypes.STRING,
			top3FlaggedAmt: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},

		{ timestamps: true }
	);
	table.associate = function (models) {
		table.belongsTo(models.providers);
	};
	return table;
};
