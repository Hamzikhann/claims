"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"members",
		{
			memberId: DataTypes.STRING,
			memberName: DataTypes.STRING,
			memberDOB: DataTypes.STRING,
			memberAge: DataTypes.STRING,
			memberCountry: DataTypes.STRING,
			memberCity: DataTypes.STRING,
			memberEmployer: DataTypes.STRING,
			memberPlan: DataTypes.STRING,
			memberSex: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},

		{ timestamps: true }
	);
	table.associate = function (models) {
		table.hasMany(models.claims);
		table.belongsTo(models.users);
	};
	return table;
};
