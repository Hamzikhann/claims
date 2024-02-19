"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"physicianFlaggedCharges",
		{
			claimSubmissionYear: DataTypes.STRING,
			flaggedChargedAmount: DataTypes.STRING,
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
