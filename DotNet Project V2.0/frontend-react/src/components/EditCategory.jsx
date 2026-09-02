import { useEffect, useState } from "react";
import {
    getCategoryById,
    updateCategory
} from "../services/categoryService";

function EditCategory({ categoryId, onUpdate, onCancel }) {

    const [category, setCategory] = useState({
        catId: "",
        subcatId: "",
        catName: "",
        catImagePath: "",
        flag: true
    });

    const [loading, setLoading] = useState(true);


    // Load category details
    useEffect(() => {

        if (categoryId) {
            loadCategory();
        }

    }, [categoryId]);


    const loadCategory = async () => {

        try {

            const response =
                await getCategoryById(categoryId);

            setCategory(response.data);

            setLoading(false);

        } catch (error) {

            console.log(error);

            alert("Unable to load category");

            setLoading(false);

        }

    };


    // Handle input
    const handleChange = (e) => {

        const { name, value } = e.target;

        setCategory({
            ...category,
            [name]: value
        });

    };


    // Update category
    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            await updateCategory(
                categoryId,
                category
            );

            alert(
                "Category updated successfully"
            );

            onUpdate();

        } catch (error) {

            console.log(error);

            alert(
                "Error while updating category"
            );

        }

    };


    if (loading) {

        return (
            <div>
                Loading category...
            </div>
        );

    }


    return (

        <div className="edit-category-form">

            <h2>
                Edit Category
            </h2>


            <form onSubmit={handleSubmit}>

                <div className="form-group">

                    <label>
                        Category ID
                    </label>

                    <input
                        type="text"
                        name="catId"
                        value={category.catId || ""}
                        onChange={handleChange}
                        required
                    />

                </div>


                <div className="form-group">

                    <label>
                        Sub Category ID
                    </label>

                    <input
                        type="text"
                        name="subcatId"
                        value={category.subcatId || ""}
                        onChange={handleChange}
                        required
                    />

                </div>


                <div className="form-group">

                    <label>
                        Category Name
                    </label>

                    <input
                        type="text"
                        name="catName"
                        value={category.catName || ""}
                        onChange={handleChange}
                        required
                    />

                </div>


                <div className="form-group">

                    <label>
                        Image Path
                    </label>

                    <input
                        type="text"
                        name="catImagePath"
                        value={
                            category.catImagePath || ""
                        }
                        onChange={handleChange}
                    />

                </div>


                <div className="checkbox-group">

                    <input
                        type="checkbox"
                        checked={category.flag || false}
                        onChange={(e) =>
                            setCategory({
                                ...category,
                                flag: e.target.checked
                            })
                        }
                    />

                    <label>
                        Active
                    </label>

                </div>


                <div className="edit-actions">

                    <button
                        type="submit"
                        className="save-category-btn"
                    >
                        UPDATE CATEGORY
                    </button>


                    <button
                        type="button"
                        className="cancel-btn"
                        onClick={onCancel}
                    >
                        CANCEL
                    </button>

                </div>

            </form>

        </div>

    );

}

export default EditCategory;