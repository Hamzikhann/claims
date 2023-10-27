"use strict";

module.exports = (sequelize, DataTypes) => {
	const courses = sequelize.define(
		"courses",
		{
			title: DataTypes.STRING,
			about: DataTypes.STRING,
			code: DataTypes.STRING,
			level: DataTypes.STRING,
			language: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);
	courses.associate = function (models) {
		courses.belongsTo(models.courseDepartments);
		courses.hasMany(models.courseAssignments);
		courses.hasMany(models.courseBooks);
		courses.hasMany(models.courseFaqs);
		courses.hasMany(models.courseInstructors);
		courses.hasMany(models.courseObjectives);
		courses.hasMany(models.courseUsefulLinks);
		courses.hasOne(models.courseSyllabus);
	};
	return courses;
};
