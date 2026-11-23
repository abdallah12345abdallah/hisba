// One colour per grade by its position in the manifest, shared by the crates and the top strip so a grade looks the same everywhere.
export const GRADE_COLORS = ['#0e7490', '#22b8cf', '#2dd4bf', '#5cc8b0', '#f97362', '#f5a35c']
export const gradeColor = (i) => GRADE_COLORS[i % GRADE_COLORS.length]
