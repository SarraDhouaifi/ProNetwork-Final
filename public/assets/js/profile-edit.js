document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. ADD EXPERIENCE ROW ---
    const addExpBtn = document.getElementById('add-experience-btn');
    if (addExpBtn) {
        addExpBtn.addEventListener('click', function() {
            const container = document.getElementById('experience-container');
            const newRow = `
                <div class="experience-item">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <h4 style="color: #4b5563; font-size: 14px; margin: 0;">New Position</h4>
                        <button type="button" onclick="this.parentElement.parentElement.remove()" class="btn-remove">
                            <i class="fa-solid fa-trash"></i> Remove
                        </button>
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>Title / Role</label>
                            <div class="input-wrapper">
                                <i class="fa-solid fa-briefcase"></i>
                                <input type="text" name="titles[]" placeholder="e.g. Senior Developer">
                            </div>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Company</label>
                            <div class="input-wrapper">
                                <i class="fa-solid fa-building"></i>
                                <input type="text" name="companies[]" placeholder="e.g. TechCorp">
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Duration</label>
                        <div class="input-wrapper">
                            <i class="fa-regular fa-calendar"></i>
                            <input type="text" name="durations[]" placeholder="e.g. 2020 - Present">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="descriptions[]" rows="2" placeholder="Briefly describe your responsibilities..."></textarea>
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', newRow);
        });
    }

    // --- 2. ADD EDUCATION ROW ---
    const addEduBtn = document.getElementById('add-education-btn');
    if (addEduBtn) {
        addEduBtn.addEventListener('click', function() {
            const container = document.getElementById('education-container');
            const newRow = `
                <div class="education-item">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <h4 style="color: #0f766e; font-size: 14px; margin: 0;">New Education</h4>
                        <button type="button" onclick="this.parentElement.parentElement.remove()" class="btn-remove">
                            <i class="fa-solid fa-trash"></i> Remove
                        </button>
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>Degree</label>
                            <div class="input-wrapper">
                                <i class="fa-solid fa-graduation-cap"></i>
                                <input type="text" name="edu_degree[]" placeholder="e.g. B.S. Computer Science">
                            </div>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>University</label>
                            <div class="input-wrapper">
                                <i class="fa-solid fa-school"></i>
                                <input type="text" name="edu_university[]" placeholder="e.g. MIT">
                            </div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>Year</label>
                            <div class="input-wrapper">
                                <i class="fa-regular fa-calendar"></i>
                                <input type="text" name="edu_year[]" placeholder="e.g. 2018 - 2022">
                            </div>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Location</label>
                            <div class="input-wrapper">
                                <i class="fa-solid fa-location-dot"></i>
                                <input type="text" name="edu_location[]" placeholder="e.g. Boston, MA">
                            </div>
                        </div>
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', newRow);
        });
    }

    // --- 3. ADD LANGUAGE ROW ---
    const addLangBtn = document.getElementById('add-language-btn');
    if (addLangBtn) {
        addLangBtn.addEventListener('click', function() {
            const container = document.getElementById('language-container');
            const newRow = `
                <div class="language-item">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <div class="input-wrapper" style="flex: 1;">
                            <i class="fa-solid fa-language"></i>
                            <input type="text" name="lang_name[]" placeholder="Language (e.g. English)">
                        </div>
                        <div class="input-wrapper" style="flex: 1;">
                            <i class="fa-solid fa-layer-group"></i>
                            <input type="text" name="lang_level[]" placeholder="Level (e.g. Native)">
                        </div>
                        <button type="button" onclick="this.parentElement.parentElement.remove()" class="btn-remove">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', newRow);
        });
    }
});