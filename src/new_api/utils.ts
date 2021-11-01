export function find_target_item_in_vendors(
  vendors: Vendor[],
  product_id: string
): Item | undefined {
  let target;
  vendors.forEach((vendor) => {
    vendor.sorted.forEach((itemWrapper) => {
      const item = itemWrapper.item;
      if (item.Id === product_id) {
        target = item;
      }
    });
  });

  return target;
}
