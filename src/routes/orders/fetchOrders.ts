export const ORDERS_URL = "https://script.google.com/macros/s/AKfycbzlu65HVW4SqV1K3Yjm4sPleXBPqaWkAsWXdxbsosriAK8q8eiFNjyaczPF_FC2wGmwUA/exec?action=getOrders"; // Replace with your actual JSON API URL

export async function fetchOrders() {
  const res = await fetch(ORDERS_URL);
  if (!res.ok) throw new Error("Failed to load orders");
  
  const data = await res.json();
  
  // Normalize capital case keys to internal component structure
  return data.map((o: any) => ({
    item: o.Item ?? o.item,
    company: o.Company ?? o.company,
    link: o.Link ?? o.link,
    price: o.Price ?? o.price,
    quantity: o.Quantity ?? o.quantity,
    notes: o.Notes ?? o.notes,
    category: (o.Category || o.category || "").toLowerCase(),
    team: o.Team ?? o.user,
    timestamp: o.Timestamp ?? o.timestamp,
    total: o.Total ?? o.total,
    status: o.Status ?? o.status,
    tracking: o.Tracking ?? o.tracking,
    id: o["List UUID"] || o.id || crypto.randomUUID(),
    orderUUID: o["Order UUID"] || "",
  }));
}
