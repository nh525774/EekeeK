import React, { useEffect, useState } from "react";
import { hp, wp } from "../helpers/common";
import { useNavigate } from "react-router-dom";
import Icon from "../assets/icons";
import Avatar from "../components/Avatar";
import { useAuth } from "../contexts/authContext";
import { getUserImageSrc, uploadFile } from "../services/imageService";
import { updateUser } from "../services/userService";
import theme from "../constants/theme";

const EditProfile = () => {

  const {user: currentUser, setUserData} = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [user, setUser] = useState({
    name: '',
    phoneNumber: '',
    image: null,
    bio: '',
    address: ''
  });

  useEffect(() => {
    if (currentUser) {
      setUser({
        name: currentUser.name || '',
        phoneNumber: currentUser.phoneNumber || '',
        image: currentUser.image || null,
        address: currentUser.address || '',
        bio: currentUser.bio || '',
      });
    }
  }, [currentUser])

  const onPickImage = async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setUser({ ...user, image: file });
      }
    };
    fileInput.click();
  };

  const onSubmit = async () => {
    let userData = {...user};
    let {name, phoneNumber, address, image, bio } = userData;
    if(!name || !phoneNumber || !address || !bio || !image) {
      alert('Profile, "Please fill all the fields');
      return;
    }
    setLoading(true);

    if (typeof image == 'object') {
      //upload image
      const res = await uploadFile("profiles", image);
      if (res.success) userData.image = res.url;
      else userData.image = null;
    }
    
    //update user
    const res = await updateUser(currentUser?.id, userData);
    setLoading(false);
    
    if (res.success) {
      setUserData({ ...currentUser, ...userData });
      navigate(-1); // 뒤로 가기
    } else {
      alert("업데이트 실패");
    }
  };

  const imageSource =
    user.image && typeof user.image === "object"
      ? URL.createObjectURL(user.image)
      : getUserImageSrc(user);

  return (
    <div style={styles.container}>
      <h2>Edit Profile</h2>
          {/* form */}
          <div style={styles.avatarContainerr}>
            <Img src={imageSource} alt="avatar" style={styles.avatar} />
              <button onClick={onPickImage} style={styles.cameraIcon}>
                <Icon name="camera" size={20} strokeWidth={2.5} />
              </button>
          </div>
          <p style={styles.hint}>
            Please fill your profile details
          </p>
          <Input 
            icon={<Icon name="user" />}
            palceholder='Enter your name'
            value={user.name}
            onChange={(e) => setUser({...user, name: e.target.value})}
            />
            <Input 
            icon={<Icon name="call" />}
            palceholder='Enter your phone number'
            value={user.phoneNumber}
            onChange={(e) => setUser({ ...user, phoneNumber: e.target.value })}
            />
            <Input 
            icon={<Icon name="location" />}
            palceholder='Enter your address'
            value={user.address}
            onChange={(e) => setUser({ ...user, address: e.target.value })}
            />
            <Input 
            palceholder='Enter your bio'
            value={user.bio}
            multiline={true}
            containerStyle={styles.bio}
           onChange={(e) => setUser({ ...user, bio: e.target.value })}
            />

            <button onClick={onSubmit} style={styles.submitButton}>
        {loading ? "Updating..." : "Update"}
      </button>
      </div>
  );
};

export default EditProfile;


const styles = {
  container: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    paddingHorizontal: wp(4)
  },
  avatarContainer: {
    height: hp(14),
    width: hp(14),
    position: "relative",
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.xxl*1.8,
    objectFit: "cover",
    border: "1px solid " + theme.colors.darkLight,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    padding: 8,
    borderRadius: 50,
    backgroundColor: 'white',
    border: "1px solid #ccc",
    cursor: "pointer",
  },  
  
  icons: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },
  hint: {
    fontSize: "14px",
    color: "#666",
  },
 
  input : {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "10px 14px",
  },
    bio: {
      alignItems: "flex-start",
      height: hp(15),
      padding: "10px",
    },
    submitButton: {
    backgroundColor: "#007bff",
    color: "white",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
