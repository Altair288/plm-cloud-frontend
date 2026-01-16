import React from 'react';
import SharedCategoryTree, { type CategoryTreeProps } from '@/features/category/CategoryTree';

// Wrapper to keep main-page defaults without coupling the shared component to page data
const CategoryTree: React.FC<CategoryTreeProps> = (props) => (
	<SharedCategoryTree
		initialExpandedKeys={['IND-001', 'CAT-001-01']}
		defaultSelectedKeys={['CAT-001-01-01']}
		{...props}
	/>
);

export default CategoryTree;
