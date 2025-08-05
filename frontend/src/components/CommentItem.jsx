import React from 'react'
import styled from 'styled-components';
import { theme } from '../constants/theme';
import Avatar from './Avatar';

const CommentItem = ({ item, canDelete = false, onDelete }) => {
        const handleDelete = () => {
            if (window.confirm("정말 삭제하시겠습니까?")) {
                onDelete(item);
            }
        };

        return (
            <Container>
                <Avatar uri={item?.userImage || "/defaultUSer.png"} />
                <Content>
                    <Header>
                        <Name>{item?.userName || "User"}</Name>
                        <DateText>{new Date(item?.createdAt).toLocaleDateString()}</DateText>
                        {canDelete && (
                            <DeleteButton onClick={handleDelete}>삭제</DeleteButton>
                        )}
                    </Header>
                    <Text>{item?.text}</Text>
                </Content>
            </Container>
        );
    };

export default CommentItem;
export const Container = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
`;

const Content = styled.div`
  background-color: rgba(0, 0, 0, 0.06);
  flex: 1;
  padding: 8px 12px;
  border-radius: 12px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Name = styled.span`
  font-weight: bold;
`;

const DateText = styled.span`
  font-size: 12px;
  color: ${theme.colors.textLight};
`;

const Text = styled.p`
  margin: 5px 0 0 0;
  color: ${theme.colors.text};
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.rose};
  cursor: pointer;
`;
