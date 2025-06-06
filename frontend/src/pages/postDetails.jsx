import React from "react";
import useState from "../nodemodules/@types/react/index.d";
const postDetails = () => {
  const { postId } = useLocalSearchParams();
  console.log("got post Id: ", postId);

  const [post, setPost] = useState(null);

  useEffect(() => {
    getPostDetails();
  }, []);

  const getPostDetails = async () => {
    //fetch postdetails here
  };
  return <div>postDetails</div>;
};

export default postDetails;
