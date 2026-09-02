import { useState } from "react";
import { createCategory } from "../services/categoryService";

const initialCategory = {
    catId: "",
    subcatId: "",
    catName: "",
    catImagePath: "",
    flag: true
};

function AddCategory() {

    const [category, setCategory] = useState(initialCategory);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setCategory(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await createCategory(category);

            alert("Category added successfully");

            setCategory(initialCategory);

        } catch (error) {
            console.error("Error:", error);
            alert("Error while adding category");
        }
    };

    return (
        <div className="add-category-form">

            <h2>Add New Category</h2>

            <form onSubmit={handleSubmit}>

                <div className="form-row">

                    <div className="form-group">
                        <label>Category ID</label>

                        <input
                            type="text"
                            name="catId"
                            value={category.catId}
                            onChange={handleChange}
                            placeholder="Example: BEV"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Sub Category ID</label>

                        <input
                            type="text"
                            name="subcatId"
                            value={category.subcatId}
                            onChange={handleChange}
                            placeholder="Example: JUICE"
                        />
                    </div>

                </div>

                <div className="form-group">

                    <label>Category Name</label>

                    <input
                        type="text"
                        name="catName"
                        value={category.catName}
                        onChange={handleChange}
                        placeholder="Example: Juice"
                        required
                    />

                </div>

                <div className="form-group">

                    <label>Category Image Path</label>

                    <input
                        type="text"
                        name="catImagePath"
                        value={category.catImagePath}
                        onChange={handleChange}
                        placeholder="Example: /Images/Beverages/Juice.png"
                    />

                </div>

                <div className="form-group checkbox-group">

                    <input
                        type="checkbox"
                        checked={category.flag}
                        onChange={(e) =>
                            setCategory(prev => ({
                                ...prev,
                                flag: e.target.checked
                            }))
                        }
                    />

                    <label>Active Category</label>

                </div>

                <button
                    type="submit"
                    className="save-category-btn"
                >
                    + SAVE CATEGORY
                </button>

            </form>

        </div>
    );
}

export default AddCategory;