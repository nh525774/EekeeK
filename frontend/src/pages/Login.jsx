import ScreenWrapper from "../components/ScreenWrapper";
import Icon from "../assets/icons";
import { theme } from "../constants/theme";

const Login = () => {
  return (
    <ScreenWrapper>
      <h2>Login</h2>
      <Icon name="Home" size={32} strokeWidth={2} color={theme.colors.rose} />
    </ScreenWrapper>
  );
};

export default Login;
